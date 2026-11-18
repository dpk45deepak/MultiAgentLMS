import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TutorSessionCreateBodySchema, parseJsonBody } from '@/lib/validation/api';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/tutor/sessions?topicId=…            -> list of the user's sessions
 * GET /api/tutor/sessions?topicId=…&latest=1   -> the newest session for that
 *   topic plus its messages (used to restore the conversation on page load).
 */
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'You need to be logged in to do this.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const topicId = searchParams.get('topicId');
  const latest = searchParams.get('latest') === '1';

  if (topicId && !UUID_RE.test(topicId)) return NextResponse.json({ error: 'Invalid topic id.' }, { status: 400 });

  let query = supabase
    .from('chat_sessions')
    .select('id, topic_id, mode, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (topicId) query = query.eq('topic_id', topicId);
  query = query.limit(latest ? 1 : 100);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Could not load sessions.' }, { status: 500 });

  if (!latest) return NextResponse.json({ sessions: data });

  const session = data?.[0] ?? null;
  if (!session) return NextResponse.json({ session: null, messages: [] });

  const { data: messages, error: messagesError } = await supabase
    .from('chat_messages')
    .select('id, role, content, created_at')
    .eq('session_id', session.id)
    .order('created_at', { ascending: true })
    .limit(200);
  if (messagesError) return NextResponse.json({ error: 'Could not load the conversation.' }, { status: 500 });

  return NextResponse.json({ session, messages: messages ?? [] });
}

/** Explicit session creation (the chat UI no longer calls this: sessions are created on the first message). */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'You need to be logged in to do this.' }, { status: 401 });

  const parsed = await parseJsonBody(request, TutorSessionCreateBodySchema);
  if (!parsed.ok) return parsed.response;
  const { topicId, mode } = parsed.data;

  const { data: topic } = await supabase
    .from('topics')
    .select('id')
    .eq('id', topicId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!topic) return NextResponse.json({ error: 'Topic not found.' }, { status: 404 });

  const { data: session, error } = await supabase
    .from('chat_sessions')
    .insert({ user_id: user.id, topic_id: topicId, mode: mode ?? 'normal' })
    .select('id')
    .single();

  if (error || !session) return NextResponse.json({ error: 'Could not start a session.' }, { status: 500 });

  return NextResponse.json({ sessionId: session.id });
}
