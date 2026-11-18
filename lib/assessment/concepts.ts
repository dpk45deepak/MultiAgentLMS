import type { AdminClient } from '@/lib/supabase/admin';
import { normalizeConceptName, type ConceptRef } from './utils';

/** Existing canonical concept names for a topic (passed to the question-generation prompt). */
export async function fetchTopicConcepts(admin: AdminClient, topicId: string): Promise<ConceptRef[]> {
  const { data } = await admin.from('concepts').select('id, name').eq('topic_id', topicId).limit(200);
  return (data ?? []) as ConceptRef[];
}

/**
 * Makes sure a `concepts` row exists for every label and returns a map from
 * normalised label -> canonical concept. Labels the model wrote slightly
 * differently ("cpu scheduling." vs "CPU Scheduling") resolve to one row, so
 * performance averages no longer fragment.
 */
export async function canonicalizeConcepts(
  admin: AdminClient,
  topicId: string,
  labels: string[]
): Promise<Map<string, ConceptRef>> {
  const known = new Map<string, ConceptRef>();
  const { data: existing } = await admin
    .from('concepts')
    .select('id, name, normalized_name')
    .eq('topic_id', topicId);
  for (const row of existing ?? []) known.set(row.normalized_name, { id: row.id, name: row.name });

  const toCreate = new Map<string, string>();
  for (const label of labels) {
    const normalized = normalizeConceptName(label);
    if (!normalized || known.has(normalized) || toCreate.has(normalized)) continue;
    toCreate.set(normalized, label.trim().slice(0, 120));
  }

  if (toCreate.size > 0) {
    await admin.from('concepts').upsert(
      Array.from(toCreate.entries()).map(([normalized_name, name]) => ({ topic_id: topicId, name, normalized_name })),
      { onConflict: 'topic_id,normalized_name', ignoreDuplicates: true }
    );
    const { data: created } = await admin
      .from('concepts')
      .select('id, name, normalized_name')
      .eq('topic_id', topicId)
      .in('normalized_name', Array.from(toCreate.keys()));
    for (const row of created ?? []) known.set(row.normalized_name, { id: row.id, name: row.name });
  }

  return known;
}
