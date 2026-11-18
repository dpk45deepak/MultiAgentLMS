import type { SupabaseClient } from '@supabase/supabase-js';
import type { TutorChatTurn } from '@/lib/agents/tutor-agent';

/**
 * Short-term memory answers "what has been said in this conversation so
 * far?" — scoped to one chat_session, distinct from learning_memory's
 * durable, cross-session facts (see lib/memory/long-term.ts).
 */
export async function fetchRecentHistory(
  supabase: SupabaseClient,
  sessionId: string,
  limit = 12
): Promise<TutorChatTurn[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as { role: 'user' | 'assistant'; content: string }[]).reverse();
}
