import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeSupabase, type FakeOp } from './helpers/fake-supabase';

const h = vi.hoisted(() => ({
  events: [] as string[],
  invoke: undefined as unknown as ReturnType<typeof import('vitest').vi.fn>,
  history: undefined as unknown as ReturnType<typeof import('vitest').vi.fn>,
  user: undefined as unknown,
  admin: undefined as unknown,
}));

vi.mock('@/lib/supabase/server', () => ({ createClient: () => h.user }));
vi.mock('@/lib/supabase/admin', () => ({ createServiceRoleClient: () => h.admin }));
vi.mock('@/lib/langgraph/tutor-chat-graph', () => ({ tutorChatGraph: { invoke: (...a: unknown[]) => h.invoke(...a) } }));
vi.mock('@/lib/agents/tutor-agent', () => ({ streamTutorAgent: async function* () {} }));
vi.mock('@/lib/memory/short-term', () => ({ fetchRecentHistory: (...a: unknown[]) => h.history(...a) }));
vi.mock('@/lib/memory/preferences', () => ({
  fetchLearnerPrefs: async () => ({
    language: 'english',
    preferredDifficulty: 'medium',
    explanationStyle: 'normal',
    timezone: 'Asia/Kolkata',
  }),
}));
vi.mock('@/lib/rate-limit', () => ({ enforceRateLimit: async () => null }));
vi.mock('@/lib/usage/quota', () => ({ enforceQuota: async () => null }));
vi.mock('@/lib/logger', () => ({ logger: { debug() {}, info() {}, warn() {}, error() {} } }));

const SESSION_ID = '3b241101-e2bb-4255-8caf-4136c566a962';
const TOPIC_ID = '4c352212-f3cc-4366-9dbf-5247d677b073';

function post(body: Record<string, unknown>) {
  return new Request('http://localhost/api/tutor/chat', { method: 'POST', body: JSON.stringify(body) });
}

function setup() {
  h.events = [];
  h.invoke = vi.fn();
  h.history = vi.fn();

  const resolve = (op: FakeOp) => {
    if (op.table === 'chat_sessions' && op.action === 'select') {
      return {
        data: { id: SESSION_ID, topic_id: TOPIC_ID, mode: 'normal', topics: { name: 'Deadlocks', subjects: { name: 'OS' } } },
        error: null,
      };
    }
    if (op.table === 'topics' && op.action === 'select') {
      return { data: { id: TOPIC_ID, name: 'Deadlocks', subjects: { name: 'OS' } }, error: null };
    }
    if (op.table === 'profiles') return { data: { tutor_display_name: 'Haru' }, error: null };
    if (op.table === 'chat_sessions' && op.action === 'insert') {
      h.events.push('insert:chat_sessions');
      return { data: { id: 'new-session' }, error: null };
    }
    if (op.table === 'chat_messages' && op.action === 'insert') {
      h.events.push('insert:chat_messages');
      return { data: null, error: null };
    }
    return undefined;
  };

  const { client, log } = createFakeSupabase(resolve);
  h.user = client;
  h.admin = { rpc: async () => ({ data: true, error: null }) };
  return log;
}

describe('POST /api/tutor/chat', () => {
  beforeEach(() => {
    setup();
  });

  it('reads history BEFORE writing and never feeds the new message back as history', async () => {
    const log = setup();
    const prior = [
      { role: 'user', content: 'What is a deadlock?' },
      { role: 'assistant', content: 'A circular wait.' },
    ];
    h.history.mockImplementation(async () => {
      h.events.push('history');
      return prior;
    });
    h.invoke.mockImplementation(async (_state: unknown, config: { configurable: { fetchRecentHistory: () => Promise<unknown> } }) => {
      h.events.push('graph');
      const history = (await config.configurable.fetchRecentHistory()) as { content: string }[];
      expect(history.map((m) => m.content)).not.toContain('How do I prevent one?');
      return { reply: 'Break one of the four conditions.' };
    });

    const { POST } = await import('@/app/api/tutor/chat/route');
    const res = await POST(post({ sessionId: SESSION_ID, message: 'How do I prevent one?' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reply).toBe('Break one of the four conditions.');
    // history is read first, the model runs, and only THEN is anything written
    expect(h.events).toEqual(['history', 'graph', 'insert:chat_messages']);

    const insert = log.find((o) => o.table === 'chat_messages' && o.action === 'insert')!;
    const rows = insert.payload as { role: string; content: string }[];
    expect(rows.map((r) => r.role)).toEqual(['user', 'assistant']);
    expect(rows[0].content).toBe('How do I prevent one?');
  });

  it('leaves no orphaned user message when the model call fails', async () => {
    const log = setup();
    h.history.mockResolvedValue([]);
    h.invoke.mockRejectedValue(new Error('provider down'));

    const { POST } = await import('@/app/api/tutor/chat/route');
    const res = await POST(post({ sessionId: SESSION_ID, message: 'hello' }));

    expect(res.status).toBe(502);
    expect(log.some((o) => o.table === 'chat_messages' && o.action === 'insert')).toBe(false);
  });

  it('does not create a session until the first reply succeeds', async () => {
    const log = setup();
    h.invoke.mockResolvedValue({ error: 'The AI service is busy right now. Please try again in a moment.' });

    const { POST } = await import('@/app/api/tutor/chat/route');
    const failed = await POST(post({ topicId: TOPIC_ID, message: 'hello' }));
    expect(failed.status).toBe(503);
    expect(log.some((o) => o.table === 'chat_sessions' && o.action === 'insert')).toBe(false);

    h.invoke.mockResolvedValue({ reply: 'Hi there!' });
    const ok = await POST(post({ topicId: TOPIC_ID, message: 'hello' }));
    const body = await ok.json();
    expect(ok.status).toBe(200);
    expect(body.sessionId).toBe('new-session');
    expect(h.events.indexOf('insert:chat_sessions')).toBeLessThan(h.events.indexOf('insert:chat_messages'));
  });

  it('rejects messages over 4000 characters with a 400', async () => {
    setup();
    const { POST } = await import('@/app/api/tutor/chat/route');
    const res = await POST(post({ sessionId: SESSION_ID, message: 'x'.repeat(4001) }));
    expect(res.status).toBe(400);
  });

  it('applies the requested mode to the session without wiping it', async () => {
    const log = setup();
    h.history.mockResolvedValue([]);
    h.invoke.mockResolvedValue({ reply: 'ok' });

    const { POST } = await import('@/app/api/tutor/chat/route');
    const res = await POST(post({ sessionId: SESSION_ID, message: 'hi', mode: 'deep' }));
    expect(res.status).toBe(200);
    const update = log.find((o) => o.table === 'chat_sessions' && o.action === 'update');
    expect(update?.payload).toEqual({ mode: 'deep' });
    expect(log.some((o) => o.table === 'chat_messages' && o.action === 'delete')).toBe(false);
  });
});
