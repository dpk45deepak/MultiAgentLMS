import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { enforceQuota } from '@/lib/usage/quota';
import { aiErrorStatus } from '@/lib/ai/errors';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { notesGenerationGraph, type NotesGraphConfigurable } from '@/lib/langgraph/notes-generation-graph';
import { fetchLearnerContext, recordCompletedTopicMemory } from '@/lib/memory/long-term';
import { fetchLearnerPrefs } from '@/lib/memory/preferences';
import { StructuredGenerationError } from '@/lib/ai/structured';
import { AllProvidersFailedError } from '@/lib/ai/fallback-model';
import { describeModelChain } from '@/lib/ai/gemini';
import { NotesGenerateBodySchema, parseJsonBody } from '@/lib/validation/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import { classifyNote, dedupeSections } from '@/lib/notes/sections';

export const maxDuration = 180;

const MIN_SECTIONS = 4;

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'You need to be logged in to do this.' }, { status: 401 });
  }

  const parsed = await parseJsonBody(request, NotesGenerateBodySchema);
  if (!parsed.ok) return parsed.response;
  const { topicId, regenerate } = parsed.data;

  const { data: topic, error: topicError } = await supabase
    .from('topics')
    .select('id, name, user_id, subjects(name), subtopics(name)')
    .eq('id', topicId)
    .eq('user_id', user.id)
    .single();

  if (topicError || !topic) {
    return NextResponse.json({ error: 'Topic not found.' }, { status: 404 });
  }

  const readNote = async () => {
    const { data } = await supabase
      .from('notes')
      .select('id, generation_status, created_at, note_sections(id)')
      .eq('topic_id', topicId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      generation_status: data.generation_status as string,
      created_at: data.created_at,
      sectionCount: ((data as unknown as { note_sections: unknown[] | null }).note_sections ?? []).length,
    };
  };

  let note = await readNote();
  let state = classifyNote(note);

  // Cost control: a usable note is returned as-is unless the student asked to regenerate.
  if (state === 'ready' && !regenerate) {
    return NextResponse.json({ noteId: note!.id, reused: true });
  }
  if (state === 'generating') {
    return NextResponse.json(
      { error: 'Your notes are already being generated. Give it a moment, then refresh.', generating: true },
      { status: 409 }
    );
  }

  const limited = await enforceRateLimit(user.id, 'notes_generate');
  if (limited) return limited;

  const overQuota = await enforceQuota(user.id, 'notes_generate');
  if (overQuota) return overQuota;

  const admin = createServiceRoleClient();
  const hadUsableNotes = state === 'ready';

  // --- Claim the generation slot (race-safe) --------------------------------
  let noteId: string;
  if (!note) {
    // Placeholder insert: notes.topic_id is unique, so only one concurrent
    // request can win; the loser gets a 23505 and backs off.
    const { data: placeholder, error: placeholderError } = await supabase
      .from('notes')
      .insert({ user_id: user.id, topic_id: topicId, model: describeModelChain(), generation_status: 'generating' })
      .select('id')
      .single();

    if (placeholderError || !placeholder) {
      if (placeholderError?.code === '23505') {
        note = await readNote();
        state = classifyNote(note);
        if (state === 'ready') return NextResponse.json({ noteId: note!.id, reused: true });
        return NextResponse.json(
          { error: 'Your notes are already being generated. Give it a moment, then refresh.', generating: true },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Could not start generating notes. Please try again.' }, { status: 500 });
    }
    noteId = placeholder.id;
  } else {
    // Existing dead/failed/stale note or a requested regenerate: flip it to
    // 'generating' only if nobody else did first (compare-and-swap on status).
    const { data: claimed } = await supabase
      .from('notes')
      .update({ generation_status: 'generating', created_at: new Date().toISOString() })
      .eq('id', note.id)
      .eq('user_id', user.id)
      .eq('generation_status', note.generation_status as 'ready' | 'failed' | 'generating')
      .select('id');

    if (!claimed || claimed.length === 0) {
      return NextResponse.json(
        { error: 'Your notes are already being generated. Give it a moment, then refresh.', generating: true },
        { status: 409 }
      );
    }
    noteId = note.id;
  }

  /** Leave the note in a state that never dead-ends the Generate button. */
  const release = async () => {
    await supabase
      .from('notes')
      .update({ generation_status: hadUsableNotes ? 'ready' : 'failed' })
      .eq('id', noteId)
      .eq('user_id', user.id);
  };

  const subjectName = (topic.subjects as unknown as { name: string } | null)?.name ?? 'General';
  const subtopicNames = ((topic.subtopics as unknown as { name: string }[] | null) ?? []).map((s) => s.name);
  const prefs = await fetchLearnerPrefs(supabase, user.id);

  let result;
  try {
    result = await notesGenerationGraph.invoke(
      {
        userId: user.id,
        subject: subjectName,
        topic: topic.name,
        subtopics: subtopicNames,
        language: prefs.language,
      },
      {
        configurable: {
          fetchLearnerContext: (userId, topicName) => fetchLearnerContext(supabase, userId, topicName),
        } satisfies NotesGraphConfigurable,
      }
    );
  } catch (err) {
    logger.error('notes generation failed', { topicId, error: err });
    await release();
    const busy = err instanceof AllProvidersFailedError;
    const message =
      err instanceof StructuredGenerationError || busy ? err.message : 'Notes generation failed unexpectedly.';
    return NextResponse.json({ error: message }, { status: busy ? 503 : 502 });
  }

  const sections = result.notes ? dedupeSections(result.notes.sections) : [];
  if (result.error || !result.notes || sections.length < MIN_SECTIONS) {
    logger.error('notes generation returned an error', { topicId, reason: result.error ?? 'Too few usable sections.' });
    await release();
    return NextResponse.json(
      { error: result.error ?? 'The tutor couldn\u2019t produce notes for this topic. Please try again.' },
      { status: aiErrorStatus(result.error) }
    );
  }

  // One statement: upsert replaces same-keyed sections atomically, so a failed
  // regenerate can never leave the note with zero sections.
  const { error: sectionsError } = await supabase.from('note_sections').upsert(
    sections.map((section, i) => ({
      note_id: noteId,
      section_key: section.key,
      title: section.title,
      content_markdown: section.content_markdown,
      order_index: i,
    })),
    { onConflict: 'note_id,section_key' }
  );

  if (sectionsError) {
    logger.error('note_sections upsert failed', { topicId, error: sectionsError });
    await release();
    return NextResponse.json({ error: 'Generated notes could not be saved. Please try again.' }, { status: 500 });
  }

  // Drop sections from an earlier version that the new notes no longer contain.
  await supabase
    .from('note_sections')
    .delete()
    .eq('note_id', noteId)
    .not('section_key', 'in', `(${sections.map((s) => s.key).join(',')})`);

  await supabase
    .from('notes')
    .update({ generation_status: 'ready', model: describeModelChain() })
    .eq('id', noteId)
    .eq('user_id', user.id);

  // topics.status is write-protected from the browser (migration 004).
  await admin.from('topics').update({ status: 'notes_ready' }).eq('id', topicId).eq('user_id', user.id).neq('status', 'completed');
  await supabase.from('learning_sessions').insert({ user_id: user.id, topic_id: topicId, activity_type: 'notes_generated' });
  if (!hadUsableNotes) await recordCompletedTopicMemory(supabase, user.id, topicId, topic.name);

  return NextResponse.json({ noteId, reused: false });
}
