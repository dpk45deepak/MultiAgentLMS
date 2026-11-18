import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeSupabase, type FakeOp } from './helpers/fake-supabase';

const h = vi.hoisted(() => ({
  grade: undefined as unknown as ReturnType<typeof import('vitest').vi.fn>,
  user: undefined as unknown,
  admin: undefined as unknown,
}));

vi.mock('@/lib/supabase/server', () => ({ createClient: () => h.user }));
vi.mock('@/lib/supabase/admin', () => ({ createServiceRoleClient: () => h.admin }));
vi.mock('@/lib/langgraph/grading-graph', () => ({ gradingGraph: { invoke: (...a: unknown[]) => h.grade(...a) } }));
vi.mock('@/lib/memory/preferences', () => ({
  fetchLearnerPrefs: async () => ({ language: 'english', preferredDifficulty: 'medium', explanationStyle: 'normal', timezone: 'Asia/Kolkata' }),
}));
vi.mock('@/lib/rate-limit', () => ({ enforceRateLimit: async () => null }));
vi.mock('@/lib/usage/quota', () => ({ enforceQuota: async () => null }));
vi.mock('@/lib/logger', () => ({ logger: { debug() {}, info() {}, warn() {}, error() {} } }));
vi.mock('@/lib/assessment/results', () => ({
  loadAttemptResult: async () => ({
    attemptId: 'att-1',
    assessmentId: 'a1',
    score: 50,
    difficulty: 'medium',
    topic: null,
    rows: [],
    weakConcepts: [],
    failedGradingCount: 0,
  }),
}));

const A_ID = '3b241101-e2bb-4255-8caf-4136c566a962';
const Q_MCQ = '11111111-1111-4111-8111-111111111111';
const Q_S1 = '22222222-2222-4222-8222-222222222222';
const Q_S2 = '33333333-3333-4333-8333-333333333333';

const questions = [
  { id: Q_MCQ, question: 'MCQ?', type: 'mcq', options: ['A1', 'B1', 'C1', 'D1'], max_marks: 1, concept: 'Deadlocks', concept_id: 'c1', correct_answer: null, model_answer: null, rubric: null },
  { id: Q_S1, question: 'Explain 1', type: 'short_answer', options: null, max_marks: 4, concept: 'Deadlocks', concept_id: 'c1', correct_answer: null, model_answer: null, rubric: null },
  { id: Q_S2, question: 'Explain 2', type: 'short_answer', options: null, max_marks: 4, concept: 'Paging', concept_id: 'c2', correct_answer: null, model_answer: null, rubric: null },
];
// Answer keys come from the separate key table, not the question rows.
const keys = [
  { question_id: Q_MCQ, correct_answer: 'B1', model_answer: null, rubric: null, explanation: 'x' },
  { question_id: Q_S1, correct_answer: null, model_answer: 'model 1', rubric: 'r1', explanation: 'x' },
  { question_id: Q_S2, correct_answer: null, model_answer: 'model 2', rubric: 'r2', explanation: 'x' },
];

function post(answers: { questionId: string; answer: string }[]) {
  return new Request('http://localhost', { method: 'POST', body: JSON.stringify({ answers }) });
}

function setup(existingAttempt: { id: string } | null = null) {
  h.grade = vi.fn();
  const resolve = (op: FakeOp) => {
    if (op.table === 'assessments') return { data: { id: A_ID, topic_id: 't1' }, error: null };
    if (op.table === 'assessment_attempts') return { data: existingAttempt, error: null };
    if (op.table === 'assessment_questions') return { data: questions, error: null };
    if (op.table === 'assessment_answer_keys') return { data: keys, error: null };
    if (op.table === 'rpc:submit_assessment_attempt') {
      return { data: { attempt_id: 'att-1', already_submitted: false }, error: null };
    }
    return undefined;
  };
  const admin = createFakeSupabase(resolve);
  const user = createFakeSupabase(resolve);
  h.admin = admin.client;
  h.user = user.client;
  return admin.log;
}

const ctx = { params: { id: A_ID } };
const okGrade = (score: number) => ({
  grade: { score, maxScore: 4, feedback: 'fine', strengths: [], improvements: [], confidence: 0.9 },
});

describe('POST /api/assessment/[id]/submit', () => {
  beforeEach(() => {
    setup();
  });

  it('is idempotent: a second submit returns the existing attempt and never re-grades or re-writes', async () => {
    const log = setup({ id: 'att-1' });
    const { POST } = await import('@/app/api/assessment/[id]/submit/route');
    const res = await POST(post([{ questionId: Q_MCQ, answer: 'B1' }]), ctx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.alreadySubmitted).toBe(true);
    expect(h.grade).not.toHaveBeenCalled();
    expect(log.some((o) => o.table === 'rpc:submit_assessment_attempt')).toBe(false);
  });

  it('grades MCQs against the server-side key and writes everything through ONE rpc', async () => {
    const log = setup();
    h.grade.mockResolvedValueOnce(okGrade(4)).mockResolvedValueOnce(okGrade(0));
    const { POST } = await import('@/app/api/assessment/[id]/submit/route');
    const res = await POST(
      post([
        { questionId: Q_MCQ, answer: ' b1 ' },
        { questionId: Q_S1, answer: 'a full answer' },
        { questionId: Q_S2, answer: 'another answer' },
      ]),
      ctx
    );
    expect(res.status).toBe(200);

    const rpc = log.filter((o) => o.table === 'rpc:submit_assessment_attempt');
    expect(rpc).toHaveLength(1);
    const args = rpc[0].payload as { p_score: number; p_answers: { question_id: string; is_correct: boolean | null; score: number }[]; p_weak_concepts: string[] };
    expect(args.p_answers.find((a) => a.question_id === Q_MCQ)?.is_correct).toBe(true);
    expect(args.p_score).toBe(Math.round(((1 + 4 + 0) / 9) * 100));
    expect(args.p_weak_concepts).toContain('Paging');

    // no direct table writes from the route: attempt/answers/performance all go through the RPC
    expect(log.filter((o) => ['insert', 'update', 'upsert'].includes(o.action))).toHaveLength(0);
  });

  it('does not send a blank short answer to the AI grader', async () => {
    setup();
    h.grade.mockResolvedValue(okGrade(3));
    const { POST } = await import('@/app/api/assessment/[id]/submit/route');
    await POST(
      post([
        { questionId: Q_MCQ, answer: 'B1' },
        { questionId: Q_S1, answer: '   ' },
        { questionId: Q_S2, answer: 'real answer' },
      ]),
      ctx
    );
    expect(h.grade).toHaveBeenCalledTimes(1);
  });

  it('saves nothing and returns 503 when every short answer fails to grade (AI outage)', async () => {
    const log = setup();
    h.grade.mockResolvedValue({ error: 'The AI service is busy right now. Please try again in a moment.' });
    const { POST } = await import('@/app/api/assessment/[id]/submit/route');
    const res = await POST(
      post([
        { questionId: Q_MCQ, answer: 'B1' },
        { questionId: Q_S1, answer: 'x' },
        { questionId: Q_S2, answer: 'y' },
      ]),
      ctx
    );
    expect(res.status).toBe(503);
    expect(log.some((o) => o.table === 'rpc:submit_assessment_attempt')).toBe(false);
  });

  it('records a partially failed grading as failed and excludes it from the score', async () => {
    const log = setup();
    h.grade.mockResolvedValueOnce(okGrade(4)).mockResolvedValueOnce({ error: 'boom' });
    const { POST } = await import('@/app/api/assessment/[id]/submit/route');
    await POST(
      post([
        { questionId: Q_MCQ, answer: 'B1' },
        { questionId: Q_S1, answer: 'x' },
        { questionId: Q_S2, answer: 'y' },
      ]),
      ctx
    );
    const args = log.find((o) => o.table === 'rpc:submit_assessment_attempt')!.payload as {
      p_score: number;
      p_answers: { grading_status: string }[];
    };
    expect(args.p_answers.filter((a) => a.grading_status === 'failed')).toHaveLength(1);
    expect(args.p_score).toBe(Math.round(((1 + 4) / 5) * 100));
  });

  it('rejects an oversized short answer with a 400', async () => {
    setup();
    const { POST } = await import('@/app/api/assessment/[id]/submit/route');
    const res = await POST(post([{ questionId: Q_S1, answer: 'x'.repeat(2001) }]), ctx);
    expect(res.status).toBe(400);
  });
});
