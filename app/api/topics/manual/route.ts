import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { ManualTopicBodySchema, parseJsonBody } from '@/lib/validation/api';
import { cleanName, topicNormalizedName } from '@/lib/syllabus/names';
import { findOrCreateSubject } from '@/lib/syllabus/persist';

/**
 * Lets a student manually enter a subject + topic without running the
 * syllabus agent. Subject names are matched case/whitespace-insensitively so
 * "operating systems" and "Operating Systems" are one subject.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'You need to be logged in to do this.' }, { status: 401 });
  }

  const parsed = await parseJsonBody(request, ManualTopicBodySchema);
  if (!parsed.ok) return parsed.response;

  const topicName = cleanName(parsed.data.topic);
  const subject = await findOrCreateSubject(supabase, user.id, parsed.data.subject);
  if (!subject) return NextResponse.json({ error: 'Could not save the subject.' }, { status: 500 });

  const admin = createServiceRoleClient();
  const normalized = topicNormalizedName(topicName);

  const { data: existing } = await admin
    .from('topics')
    .select('id')
    .eq('user_id', user.id)
    .eq('subject_id', subject.id)
    .eq('normalized_name', normalized)
    .maybeSingle();
  if (existing) return NextResponse.json({ topicId: existing.id });

  const { data: topicRow, error: topicError } = await admin
    .from('topics')
    .upsert(
      { user_id: user.id, subject_id: subject.id, name: topicName, normalized_name: normalized },
      { onConflict: 'user_id,subject_id,normalized_name', ignoreDuplicates: false }
    )
    .select('id')
    .single();

  if (topicError || !topicRow) {
    return NextResponse.json({ error: 'Could not save that topic.' }, { status: 500 });
  }

  return NextResponse.json({ topicId: topicRow.id });
}
