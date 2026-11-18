import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Feature 6 — richer Mentor context: the student's own recent questions to
 * the Tutor. `chat_messages` already persists every tutor exchange (nothing
 * new to write here — see app/api/tutor/chat/route.ts); this only reads it.
 *
 * Deliberately narrow: only `role = 'user'` messages (the student's actual
 * questions, not the Tutor's answers) and a small, fixed limit — the Mentor
 * needs a sense of what the student has been curious/confused about
 * recently, not a full transcript. Sending the whole chat history would
 * both bloat the prompt and dilute the signal.
 */
export async function fetchRecentTutorQuestions(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit = 5
): Promise<string[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('content, created_at, chat_sessions!inner(user_id)')
    .eq('chat_sessions.user_id', userId)
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data
    .map((row) => row.content.trim())
    .filter(Boolean)
    // A defensive cap on length — a student could in principle paste a huge
    // block of text as a "question"; keep the Mentor's prompt bounded.
    .map((content) => (content.length > 300 ? `${content.slice(0, 300)}\u2026` : content));
}
