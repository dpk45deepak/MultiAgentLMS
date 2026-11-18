import type { SupabaseClient } from '@supabase/supabase-js';
import type { AdminClient } from '@/lib/supabase/admin';
import { cleanName, nameKey, topicNormalizedName, type SyllabusUnit } from './names';

export interface PersistedTopic {
  id: string;
  name: string;
  unitName: string;
}

/** Finds the user's subject case/whitespace-insensitively, or creates it. */
export async function findOrCreateSubject(
  supabase: SupabaseClient,
  userId: string,
  rawName: string
): Promise<{ id: string; name: string } | null> {
  const name = cleanName(rawName) || 'General';
  const { data: subjects } = await supabase.from('subjects').select('id, name').eq('user_id', userId);

  const match = (subjects ?? []).find((s: { id: string; name: string }) => nameKey(s.name) === nameKey(name));
  if (match) return match;

  const { data: created, error } = await supabase
    .from('subjects')
    .insert({ user_id: userId, name })
    .select('id, name')
    .single();

  if (error || !created) {
    // Lost a race with a concurrent request that created the same subject.
    if (error?.code === '23505') {
      const { data: again } = await supabase.from('subjects').select('id, name').eq('user_id', userId).eq('name', name).maybeSingle();
      return again ?? null;
    }
    return null;
  }
  return created;
}

/**
 * Saves a cleaned syllabus under a subject with a fixed number of queries
 * (not one per topic): existing units/topics/subtopics are skipped, new ones
 * are inserted in batches. Re-uploading the same syllabus creates nothing new.
 * Topic writes use the service-role client (topics are write-protected from the
 * browser) and are always scoped to `userId`.
 */
export async function persistSyllabus(params: {
  supabase: SupabaseClient;
  admin: AdminClient;
  userId: string;
  subjectId: string;
  units: SyllabusUnit[];
  uploadId: string | null;
}): Promise<PersistedTopic[]> {
  const { supabase, admin, userId, subjectId, units, uploadId } = params;

  // --- units -----------------------------------------------------------------
  const { data: existingUnits } = await supabase.from('units').select('id, name, order_index').eq('subject_id', subjectId);
  const unitIdByKey = new Map<string, string>();
  let nextUnitOrder = 0;
  for (const u of existingUnits ?? []) {
    unitIdByKey.set(nameKey(u.name), u.id);
    nextUnitOrder = Math.max(nextUnitOrder, u.order_index + 1);
  }

  const newUnits = units.filter((u) => !unitIdByKey.has(nameKey(u.name)));
  if (newUnits.length > 0) {
    const { data: inserted, error } = await supabase
      .from('units')
      .insert(newUnits.map((u, i) => ({ subject_id: subjectId, name: u.name, order_index: nextUnitOrder + i })))
      .select('id, name');
    if (error || !inserted) throw new Error('Could not save the syllabus units.');
    for (const u of inserted) unitIdByKey.set(nameKey(u.name), u.id);
  }

  // --- topics ----------------------------------------------------------------
  const { data: existingTopics } = await admin
    .from('topics')
    .select('id, normalized_name, order_index')
    .eq('user_id', userId)
    .eq('subject_id', subjectId);
  const knownTopics = new Set((existingTopics ?? []).map((t) => t.normalized_name));
  let nextTopicOrder = (existingTopics ?? []).reduce((max, t) => Math.max(max, t.order_index + 1), 0);

  const topicRows: {
    user_id: string;
    subject_id: string;
    unit_id: string | null;
    syllabus_upload_id: string | null;
    name: string;
    normalized_name: string;
    order_index: number;
  }[] = [];
  const unitNameByTopicKey = new Map<string, string>();

  for (const unit of units) {
    for (const topic of unit.topics) {
      const normalized = topicNormalizedName(topic.name);
      unitNameByTopicKey.set(normalized, unit.name);
      if (knownTopics.has(normalized)) continue;
      topicRows.push({
        user_id: userId,
        subject_id: subjectId,
        unit_id: unitIdByKey.get(nameKey(unit.name)) ?? null,
        syllabus_upload_id: uploadId,
        name: topic.name,
        normalized_name: normalized,
        order_index: nextTopicOrder++,
      });
    }
  }

  if (topicRows.length > 0) {
    const { error } = await admin
      .from('topics')
      .upsert(topicRows, { onConflict: 'user_id,subject_id,normalized_name', ignoreDuplicates: true });
    if (error) throw new Error('Could not save the syllabus topics.');
  }

  const allKeys = Array.from(unitNameByTopicKey.keys());
  const { data: topics } = await admin
    .from('topics')
    .select('id, name, normalized_name')
    .eq('user_id', userId)
    .eq('subject_id', subjectId)
    .in('normalized_name', allKeys);

  const topicIdByKey = new Map((topics ?? []).map((t) => [t.normalized_name, t.id]));

  // --- subtopics (skip existing, one batched insert) ---------------------------
  const topicIds = Array.from(topicIdByKey.values());
  const existingSubKeys = new Set<string>();
  if (topicIds.length > 0) {
    const { data: existingSubs } = await supabase.from('subtopics').select('topic_id, name').in('topic_id', topicIds);
    for (const s of existingSubs ?? []) existingSubKeys.add(`${s.topic_id}:${nameKey(s.name)}`);
  }

  const subRows: { topic_id: string; name: string; order_index: number }[] = [];
  for (const unit of units) {
    for (const topic of unit.topics) {
      const topicId = topicIdByKey.get(topicNormalizedName(topic.name));
      if (!topicId) continue;
      topic.subtopics.forEach((name, i) => {
        const key = `${topicId}:${nameKey(name)}`;
        if (existingSubKeys.has(key)) return;
        existingSubKeys.add(key);
        subRows.push({ topic_id: topicId, name, order_index: i });
      });
    }
  }
  if (subRows.length > 0) await supabase.from('subtopics').insert(subRows);

  return (topics ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    unitName: unitNameByTopicKey.get(t.normalized_name) ?? 'General',
  }));
}
