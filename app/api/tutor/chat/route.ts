import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { enforceQuota } from '@/lib/usage/quota';
import { aiErrorStatus } from '@/lib/ai/errors';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { tutorChatGraph, type TutorGraphConfigurable } from '@/lib/langgraph/tutor-chat-graph';
import { streamTutorAgent, type TutorChatTurn, type TutorMode } from '@/lib/agents/tutor-agent';
import { AllProvidersFailedError } from '@/lib/ai/fallback-model';
import { fetchRecentHistory } from '@/lib/memory/short-term';
import { fetchLearnerPrefs } from '@/lib/memory/preferences';
import { TutorChatBodySchema, parseJsonBody } from '@/lib/validation/api';
import { enforceRateLimit } from '@/lib/rate-limit';

export const maxDuration = 120;

type TopicInfo = { name: string; subjects: { name: string } | null } | null;

/**
 * Tutor chat.
 *
 * Ordering rules (these fix the "message appears twice" and "orphaned user
 * message" bugs):
 *  1. History is read BEFORE anything is written, so the model never sees the
 *     new message twice (the agent appends it itself).
 *  2. Nothing is persisted until the reply has fully succeeded. The session
 *     (when this is the first message), the user message and the assistant
 *     message are then written together; a failed LLM call leaves no trace.
 *
 * With `stream: true` the reply is sent as newline-delimited JSON events
 * ({type:'delta'|'done'|'error'}); otherwise a single JSON body is returned.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'You need to be logged in to do this.' }, { status: 401 });

  const limited = await enforceRateLimit(user.id, 'tutor_chat');
  if (limited) return limited;

  const overQuota = await enforceQuota(user.id, 'tutor_chat');
  if (overQuota) return overQuota;

  const parsed = await parseJsonBody(request, TutorChatBodySchema);
  if (!parsed.ok) return parsed.response;
  const { sessionId, topicId, mode: requestedMode, stream, regenerate } = parsed.data;
  let message = parsed.data.message;

  let session: { id: string; topic_id: string | null; mode: TutorMode } | null = null;
  let topic: TopicInfo = null;
  let resolvedTopicId: string | null = null;

  if (sessionId) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('id, topic_id, mode, topics(name, subjects(name))')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();
    if (error || !data) return NextResponse.json({ error: 'Chat session not found.' }, { status: 404 });
    session = { id: data.id, topic_id: data.topic_id, mode: data.mode as TutorMode };
    topic = data.topics as unknown as TopicInfo;
    resolvedTopicId = data.topic_id;
  } else {
    const { data, error } = await supabase
      .from('topics')
      .select('id, name, subjects(name)')
      .eq('id', topicId!)
      .eq('user_id', user.id)
      .single();
    if (error || !data) return NextResponse.json({ error: 'Topic not found.' }, { status: 404 });
    topic = { name: data.name, subjects: data.subjects as unknown as { name: string } | null };
    resolvedTopicId = data.id;
  }

  const [prefs, { data: profile }] = await Promise.all([
    fetchLearnerPrefs(supabase, user.id),
    supabase.from('profiles').select('tutor_display_name').eq('id', user.id).single(),
  ]);

  const mode: TutorMode = requestedMode ?? session?.mode ?? prefs.explanationStyle;

  // --- history (read before any write) --------------------------------------
  let history: TutorChatTurn[] = [];
  let regenerateTargetId: string | null = null;

  if (session) {
    if (regenerate) {
      const { data: lastTwo } = await supabase
        .from('chat_messages')
        .select('id, role, content')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false })
        .limit(2);
      const [lastAssistant, lastUser] = lastTwo ?? [];
      if (!lastAssistant || !lastUser || lastAssistant.role !== 'assistant' || lastUser.role !== 'user') {
        return NextResponse.json({ error: 'There is no reply to regenerate yet.' }, { status: 400 });
      }
      regenerateTargetId = lastAssistant.id;
      message = lastUser.content;
      history = (await fetchRecentHistory(supabase, session.id, 14)).slice(0, -2);
    } else {
      history = await fetchRecentHistory(supabase, session.id);
    }
  } else if (regenerate) {
    return NextResponse.json({ error: 'There is no reply to regenerate yet.' }, { status: 400 });
  }

  const agentInput = {
    topicName: topic?.name ?? 'General',
    subjectName: topic?.subjects?.name ?? 'General',
    mode,
    tutorDisplayName: profile?.tutor_display_name || 'AI Tutor',
    history,
    message,
    language: prefs.language,
  };

  /** Writes everything for a successful exchange; returns the session id. */
  async function persist(reply: string): Promise<string | null> {
    let id = session?.id ?? null;

    if (!id) {
      const { data: created, error } = await supabase
        .from('chat_sessions')
        .insert({ user_id: user!.id, topic_id: resolvedTopicId, mode })
        .select('id')
        .single();
      if (error || !created) return null;
      id = created.id;
    } else if (session && session.mode !== mode) {
      await supabase.from('chat_sessions').update({ mode }).eq('id', id).eq('user_id', user!.id);
    }

    if (regenerateTargetId) {
      await supabase.from('chat_messages').update({ content: reply }).eq('id', regenerateTargetId);
    } else {
      const t = Date.now();
      await supabase.from('chat_messages').insert([
        { session_id: id, role: 'user', content: message, created_at: new Date(t).toISOString() },
        { session_id: id, role: 'assistant', content: reply, created_at: new Date(t + 1).toISOString() },
      ]);
    }

    // At most one tutor_chat activity row per chat session per local day.
    try {
      await createServiceRoleClient().rpc('log_tutor_activity', {
        p_user_id: user!.id,
        p_topic_id: resolvedTopicId as string,
        p_chat_session_id: id,
        p_tz: prefs.timezone,
      });
    } catch (err) {
      logger.warn('log_tutor_activity failed', { error: err });
    }
    return id;
  }

  // --- non-streaming path ----------------------------------------------------
  if (!stream) {
    let result;
    try {
      result = await tutorChatGraph.invoke(
        {
          sessionId: session?.id ?? 'new',
          topicName: agentInput.topicName,
          subjectName: agentInput.subjectName,
          mode,
          tutorDisplayName: agentInput.tutorDisplayName,
          message,
          language: prefs.language,
        },
        {
          configurable: {
            fetchRecentHistory: async () => history,
          } satisfies TutorGraphConfigurable,
        }
      );
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'The tutor could not respond right now.' },
        { status: err instanceof AllProvidersFailedError ? 503 : 502 }
      );
    }

    if (result.error || !result.reply) {
      return NextResponse.json({ error: result.error ?? 'The tutor could not respond right now.' }, { status: aiErrorStatus(result.error) });
    }

    const id = await persist(result.reply);
    if (!id) return NextResponse.json({ error: 'Could not save this conversation.' }, { status: 500 });
    return NextResponse.json({ reply: result.reply, sessionId: id, mode });
  }

  // --- streaming path --------------------------------------------------------
  const generator = streamTutorAgent(agentInput);
  let first: IteratorResult<string, void>;
  try {
    // Wait for the first token so a provider failure still yields a normal JSON error.
    first = await generator.next();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'The tutor could not respond right now.' },
      { status: err instanceof AllProvidersFailedError ? 503 : 502 }
    );
  }
  if (first.done) {
    return NextResponse.json({ error: 'The tutor returned an empty response. Please try again.' }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      let reply = '';
      try {
        reply += first.value;
        send({ type: 'delta', text: first.value });

        for (;;) {
          if (request.signal.aborted) return; // client left: persist nothing
          const next = await generator.next();
          if (next.done) break;
          reply += next.value;
          send({ type: 'delta', text: next.value });
        }

        reply = reply.trim();
        const id = reply ? await persist(reply) : null;
        if (!id) {
          send({ type: 'error', error: 'Could not save this conversation.' });
        } else {
          send({ type: 'done', sessionId: id, reply, mode });
        }
      } catch (err) {
        try {
          send({ type: 'error', error: err instanceof Error ? err.message : 'The tutor stopped unexpectedly.' });
        } catch {
          /* controller already closed */
        }
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
