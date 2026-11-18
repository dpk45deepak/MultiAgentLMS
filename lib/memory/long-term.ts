import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Long-term memory answers "what is useful to remember about this
 * student's learning?" — not "what did the student say?" (that's
 * chat_messages, owned by the tutor agent once it's implemented).
 *
 * This slice writes one memory row per completed topic (requirement #7:
 * "Store: learning history, completed topics ..."). The mentor/tutor
 * agents in a future slice would read from here to personalise
 * recommendations.
 */

export async function fetchLearnerContext(
  supabase: SupabaseClient<Database>,
  userId: string,
  topicName: string,
  limit = 5
): Promise<string[]> {
  const { data, error } = await supabase
    .from('learning_memory')
    .select('summary')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  // Topic-specific memories are most relevant; keep the rest as light context.
  return data
    .map((row) => row.summary)
    .filter((summary) => summary.toLowerCase().includes(topicName.toLowerCase()) || true);
}

/**
 * Same idea as fetchLearnerContext but not scoped to a single topic — used
 * by the Mentor Agent, which reasons about the student's overall journey
 * rather than one topic's notes.
 */
export async function fetchAllLearnerContext(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit = 10
): Promise<string[]> {
  const { data, error } = await supabase
    .from('learning_memory')
    .select('summary')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map((row) => row.summary);
}

export async function recordCompletedTopicMemory(
  supabase: SupabaseClient<Database>,
  userId: string,
  topicId: string,
  topicName: string
) {
  await supabase.from('learning_memory').insert({
    user_id: userId,
    topic_id: topicId,
    memory_type: 'completed_topic',
    summary: `Generated and studied notes for "${topicName}".`,
  });
}

/**
 * Called after an assessment is graded — writes one durable memory row per
 * concept the student scored poorly on. This is what lets the Mentor Agent
 * later say something specific ("you've struggled with Deadlock Detection
 * across attempts") instead of only seeing the latest snapshot.
 */
export async function recordWeakConceptMemory(
  supabase: SupabaseClient<Database>,
  userId: string,
  topicId: string,
  weakConcepts: string[]
) {
  if (weakConcepts.length === 0) return;
  await supabase.from('learning_memory').insert(
    weakConcepts.map((concept) => ({
      user_id: userId,
      topic_id: topicId,
      memory_type: 'weakness' as const,
      summary: `Scored poorly on questions about "${concept}" in an assessment.`,
    }))
  );
}
