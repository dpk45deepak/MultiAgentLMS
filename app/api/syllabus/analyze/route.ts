import { NextResponse } from 'next/server';
import { enforceQuota } from '@/lib/usage/quota';
import { aiErrorStatus } from '@/lib/ai/errors';
import { AllProvidersFailedError } from '@/lib/ai/fallback-model';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { enforceRateLimit } from '@/lib/rate-limit';
import { LIMITS } from '@/lib/validation/api';
import { cleanName, cleanSyllabus } from '@/lib/syllabus/names';
import { findOrCreateSubject, persistSyllabus } from '@/lib/syllabus/persist';
import { topicAnalysisGraph } from '@/lib/langgraph/topic-analysis-graph';
import { StructuredGenerationError } from '@/lib/ai/structured';
import type { TopicAnalysis } from '@/lib/validation/schemas';

export const maxDuration = 180;

const MAX_IMAGE_BYTES = LIMITS.imageBytes; // 8MB hard cap (the browser compresses to ~3MB first)
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const STORAGE_BUCKET = 'syllabus-uploads';

function hasValidImageSignature(bytes: Buffer, mimeType: string) {
  if (mimeType === 'image/png') {
    return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (mimeType === 'image/jpeg') {
    return bytes.length >= 3 && bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  }
  if (mimeType === 'image/webp') {
    return bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  }
  return false;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'You need to be logged in to do this.' }, { status: 401 });
  }

  const limited = await enforceRateLimit(user.id, 'syllabus_analyze');
  if (limited) return limited;

  const overQuota = await enforceQuota(user.id, 'syllabus_analyze');
  if (overQuota) return overQuota;

  // Reject oversized bodies before buffering them.
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > MAX_IMAGE_BYTES + 512 * 1024) {
    return NextResponse.json({ error: 'That upload is too large — please use an image under 8MB.' }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const text = form.get('text');
  const file = form.get('file');

  let uploadId: string | null = null;
  let storagePath: string | null = null;
  let analysis: TopicAnalysis;

  async function markFailedAndCleanup(reason: string) {
    if (uploadId) {
      await supabase
        .from('syllabus_uploads')
        .update({ status: 'failed', failure_reason: reason.slice(0, 1000) })
        .eq('id', uploadId);
    }
    if (storagePath) {
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      storagePath = null;
    }
  }

  try {
    if (file instanceof File && file.size > 0) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: 'Please upload a PNG, JPEG, or WEBP image of your syllabus.' },
          { status: 400 }
        );
      }
      if (file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: 'That image is larger than 8MB — try a smaller file.' }, { status: 400 });
      }

      const bytes = Buffer.from(await file.arrayBuffer());
      if (!hasValidImageSignature(bytes, file.type)) {
        return NextResponse.json({ error: 'That file is not a valid PNG, JPEG, or WEBP image.' }, { status: 400 });
      }

      storagePath = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, bytes, { contentType: file.type });

      if (uploadError) {
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        storagePath = null;
        return NextResponse.json(
          { error: 'We couldn\u2019t save your uploaded image. Please try again.' },
          { status: 502 }
        );
      }

      const { data: uploadRow, error: uploadRowError } = await supabase
        .from('syllabus_uploads')
        .insert({ user_id: user.id, storage_path: storagePath, input_mode: 'image', status: 'pending' })
        .select('id')
        .single();

      if (uploadRowError || !uploadRow) {
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        storagePath = null;
        return NextResponse.json({ error: 'Could not record the upload.' }, { status: 500 });
      }
      uploadId = uploadRow.id;

      const graphResult = await topicAnalysisGraph.invoke({
        input: { mode: 'image', base64Image: bytes.toString('base64'), mimeType: file.type },
      });

      if (graphResult.error || !graphResult.result) {
        await markFailedAndCleanup(graphResult.error ?? 'Unknown error');
        if (graphResult.errorKind === 'busy') {
          return NextResponse.json({ error: 'The AI is busy right now. Please try again in a moment.' }, { status: 503 });
        }
        return NextResponse.json(
          { error: 'We couldn\u2019t read that syllabus image. Try a clearer photo or paste the text instead.' },
          { status: 422 }
        );
      }
      analysis = graphResult.result;
    } else if (typeof text === 'string' && text.trim().length > 0) {
      if (text.length > LIMITS.syllabusText) {
        return NextResponse.json(
          { error: `Syllabus text is limited to ${LIMITS.syllabusText.toLocaleString('en-US')} characters. Please paste a smaller section.` },
          { status: 400 }
        );
      }
      const { data: uploadRow, error: uploadRowError } = await supabase
        .from('syllabus_uploads')
        .insert({ user_id: user.id, input_mode: 'text', raw_text_input: text, status: 'pending' })
        .select('id')
        .single();

      if (uploadRowError || !uploadRow) {
        return NextResponse.json({ error: 'Could not record the input.' }, { status: 500 });
      }
      uploadId = uploadRow.id;

      const graphResult = await topicAnalysisGraph.invoke({ input: { mode: 'text', text } });

      if (graphResult.error || !graphResult.result) {
        await markFailedAndCleanup(graphResult.error ?? 'Unknown error');
        if (graphResult.errorKind === 'busy') {
          return NextResponse.json({ error: 'The AI is busy right now. Please try again in a moment.' }, { status: 503 });
        }
        return NextResponse.json(
          { error: 'We couldn\u2019t make sense of that text. Try listing units and topics more explicitly.' },
          { status: 422 }
        );
      }
      analysis = graphResult.result;
    } else {
      return NextResponse.json(
        { error: 'Upload a syllabus image or paste some syllabus text first.' },
        { status: 400 }
      );
    }
  } catch (err) {
    await markFailedAndCleanup(err instanceof Error ? err.message : 'Syllabus analysis failed.');
    if (err instanceof AllProvidersFailedError) {
      return NextResponse.json({ error: 'The AI is busy right now. Please try again in a moment.' }, { status: 503 });
    }
    const message =
      err instanceof StructuredGenerationError
        ? err.message
        : 'Something went wrong while analysing your syllabus. Please try again.';
    return NextResponse.json({ error: message }, { status: aiErrorStatus(message) });
  }

  const units = cleanSyllabus(analysis.units);
  if (units.length === 0) {
    await markFailedAndCleanup('No readable syllabus topics were found.');
    return NextResponse.json(
      { error: 'We could not find readable units or topics in that syllabus. Try a clearer image or paste the text instead.' },
      { status: 422 }
    );
  }

  try {
    const subject = await findOrCreateSubject(supabase, user.id, cleanName(analysis.subject));
    if (!subject) {
      await markFailedAndCleanup('Could not save the detected subject.');
      return NextResponse.json({ error: 'Could not save the detected subject.' }, { status: 500 });
    }

    const createdTopics = await persistSyllabus({
      supabase,
      admin: createServiceRoleClient(),
      userId: user.id,
      subjectId: subject.id,
      units,
      uploadId,
    });

    if (createdTopics.length === 0) {
      await markFailedAndCleanup('No topics could be saved.');
      return NextResponse.json({ error: 'The syllabus was read, but no topics could be saved. Please try again.' }, { status: 500 });
    }

    if (uploadId) {
      await supabase.from('syllabus_uploads').update({ status: 'processed', subject_id: subject.id }).eq('id', uploadId);
    }

    return NextResponse.json({ subject: subject.name, subjectId: subject.id, topics: createdTopics });
  } catch (err) {
    await markFailedAndCleanup(err instanceof Error ? err.message : 'Syllabus persistence failed.');
    return NextResponse.json({ error: 'The syllabus was analyzed but could not be saved. Please try again.' }, { status: 500 });
  }
}
