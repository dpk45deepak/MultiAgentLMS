import { NextResponse } from 'next/server';
import { enforceQuota } from '@/lib/usage/quota';
import { aiErrorStatus } from '@/lib/ai/errors';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { assessmentGenerationGraph } from '@/lib/langgraph/assessment-generation-graph';
import { StructuredGenerationError } from '@/lib/ai/structured';
import { AllProvidersFailedError } from '@/lib/ai/fallback-model';
import type { AssessmentQuestion } from '@/lib/validation/schemas';
import { AssessmentGenerateBodySchema, parseJsonBody } from '@/lib/validation/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import { fetchLearnerPrefs } from '@/lib/memory/preferences';
import { canonicalizeConcepts, fetchTopicConcepts } from '@/lib/assessment/concepts';
import { difficultyForScore, normalizeConceptName, shuffle } from '@/lib/assessment/utils';

export const maxDuration = 120;

const TOTAL_QUESTIONS = 5;
// By default a generated assessment mixes MCQ and short-answer questions.
// `includeShortAnswer: false` keeps the MCQ-only behaviour.
const SHORT_ANSWER_COUNT_WHEN_ENABLED = 2;
/** An unfinished quiz younger than this is resumed instead of generating (and paying for) a new one. */
const RESUME_WINDOW_MS = 24 * 60 * 60 * 1000;

interface Outcome {
  status: number;
  body: Record<string, unknown>;
}

// Per-instance guard against double-click / double-tab: concurrent requests
// for the same user+topic share one generation instead of paying twice.
const inflight = new Map<string, Promise<Outcome>>();

/**
 * Adaptive difficulty: looks at the student's most recent completed attempt
 * for this topic. >=80% -> harder, 50-79% -> medium, <50% -> easier. With no
 * prior attempt it falls back to the Settings preference (or 'medium').
 */
async function resolveAdaptiveDifficulty(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  topicId: string,
  preferred: 'easy' | 'medium' | 'hard' | 'adaptive'
): Promise<'easy' | 'medium' | 'hard'> {
  const { data: lastAttempt } = await supabase
    .from('assessment_attempts')
    .select('score, assessments!inner(topic_id)')
    .eq('user_id', userId)
    .eq('assessments.topic_id', topicId)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const fromScore = difficultyForScore(lastAttempt?.score);
  if (fromScore) return fromScore;
  return preferred === 'easy' || preferred === 'medium' || preferred === 'hard' ? preferred : 'medium';
}

/** Maps one generated question to its (key-free) assessment_questions row. */
function toQuestionRow(
  q: AssessmentQuestion,
  assessmentId: string,
  orderIndex: number,
  concept: { id: string | null; name: string }
) {
  return {
    assessment_id: assessmentId,
    question: q.question,
    type: q.type,
    options: q.type === 'mcq' ? shuffle(q.options) : null,
    difficulty: q.difficulty,
    concept: concept.name,
    concept_id: concept.id,
    order_index: orderIndex,
    max_marks: q.type === 'mcq' ? 1 : q.maxMarks,
  };
}

async function findResumable(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  topicId: string
): Promise<{ id: string; difficulty: string } | null> {
  const since = new Date(Date.now() - RESUME_WINDOW_MS).toISOString();
  const { data } = await supabase
    .from('assessments')
    .select('id, difficulty, created_at, assessment_attempts(id)')
    .eq('user_id', userId)
    .eq('topic_id', topicId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(5);

  const open = (data ?? []).find(
    (a) => (((a as unknown as { assessment_attempts: unknown[] | null }).assessment_attempts ?? []).length === 0)
  );
  return open ? { id: open.id, difficulty: open.difficulty } : null;
}

async function generate(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  topicId: string,
  requestedDifficulty: 'easy' | 'medium' | 'hard' | 'adaptive',
  includeShortAnswer: boolean
): Promise<Outcome> {
  const { data: topic, error: topicError } = await supabase
    .from('topics')
    .select('id, name, subjects(name)')
    .eq('id', topicId)
    .eq('user_id', userId)
    .single();

  if (topicError || !topic) return { status: 404, body: { error: 'Topic not found.' } };

  const prefs = await fetchLearnerPrefs(supabase, userId);
  const difficulty =
    requestedDifficulty === 'adaptive'
      ? await resolveAdaptiveDifficulty(supabase, userId, topicId, prefs.preferredDifficulty)
      : requestedDifficulty;

  const admin = createServiceRoleClient();
  const knownConcepts = await fetchTopicConcepts(admin, topicId);

  const subjectName = (topic.subjects as unknown as { name: string } | null)?.name ?? 'General';
  const shortAnswerCount = includeShortAnswer ? SHORT_ANSWER_COUNT_WHEN_ENABLED : 0;
  const mcqCount = TOTAL_QUESTIONS - shortAnswerCount;

  let result;
  try {
    result = await assessmentGenerationGraph.invoke({
      subject: subjectName,
      topic: topic.name,
      difficulty,
      mcqCount,
      shortAnswerCount,
      language: prefs.language,
      knownConcepts: knownConcepts.map((c) => c.name),
    });
  } catch (err) {
    const busy = err instanceof AllProvidersFailedError;
    return {
      status: busy ? 503 : 502,
      body: {
        error:
          err instanceof StructuredGenerationError || busy ? err.message : 'Could not generate an assessment.',
      },
    };
  }

  if (result.error || !result.questions) {
    return { status: aiErrorStatus(result.error), body: { error: result.error ?? 'Could not generate an assessment.' } };
  }

  const questions = result.questions.questions;
  const concepts = await canonicalizeConcepts(
    admin,
    topicId,
    questions.map((q) => q.concept)
  );

  // The resolved difficulty (never 'adaptive') is what we store.
  const { data: assessmentRow, error: assessmentError } = await admin
    .from('assessments')
    .insert({ user_id: userId, topic_id: topicId, difficulty })
    .select('id')
    .single();

  if (assessmentError || !assessmentRow) {
    return { status: 500, body: { error: 'Could not save the assessment.' } };
  }

  const rows = questions.map((q, i) => {
    const ref = concepts.get(normalizeConceptName(q.concept));
    return toQuestionRow(q, assessmentRow.id, i, {
      id: ref?.id ?? null,
      name: ref?.name ?? (q.concept.trim() || topic.name),
    });
  });

  const { data: questionRows, error: questionsError } = await admin
    .from('assessment_questions')
    .insert(rows)
    .select('id, question, type, options, max_marks, order_index');

  if (questionsError || !questionRows || questionRows.length !== questions.length) {
    await admin.from('assessments').delete().eq('id', assessmentRow.id);
    return { status: 500, body: { error: 'Could not save the generated questions.' } };
  }

  // Answer keys go in a separate table the browser can never read.
  const ordered = [...questionRows].sort((a, b) => a.order_index - b.order_index);
  const keyRows = ordered.map((row, i) => {
    const q = questions[i];
    return q.type === 'mcq'
      ? { question_id: row.id, correct_answer: q.correctAnswer, explanation: q.explanation }
      : { question_id: row.id, model_answer: q.modelAnswer, rubric: q.rubric, explanation: q.explanation };
  });

  const { error: keysError } = await admin.from('assessment_answer_keys').insert(keyRows);
  if (keysError) {
    await admin.from('assessments').delete().eq('id', assessmentRow.id); // cascades to questions
    return { status: 500, body: { error: 'Could not save the answer key for this assessment.' } };
  }

  return {
    status: 200,
    body: {
      assessmentId: assessmentRow.id,
      difficulty,
      resumed: false,
      questions: ordered.map((q) => ({
        id: q.id,
        type: q.type,
        question: q.question,
        options: q.options,
        maxMarks: q.max_marks,
      })),
    },
  };
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'You need to be logged in to do this.' }, { status: 401 });

  const parsed = await parseJsonBody(request, AssessmentGenerateBodySchema);
  if (!parsed.ok) return parsed.response;
  const { topicId, difficulty: requestedDifficulty, includeShortAnswer, forceNew } = parsed.data;

  // Re-opening an unfinished quiz costs nothing, so it is not rate limited.
  if (!forceNew) {
    const resumable = await findResumable(supabase, user.id, topicId);
    if (resumable) {
      return NextResponse.json({ assessmentId: resumable.id, difficulty: resumable.difficulty, resumed: true });
    }
  }

  const limited = await enforceRateLimit(user.id, 'assessment_generate');
  if (limited) return limited;

  const overQuota = await enforceQuota(user.id, 'assessment_generate');
  if (overQuota) return overQuota;

  const key = `${user.id}:${topicId}`;
  let pending = inflight.get(key);
  if (!pending) {
    pending = generate(supabase, user.id, topicId, requestedDifficulty, includeShortAnswer).finally(() => {
      inflight.delete(key);
    });
    inflight.set(key, pending);
  }

  const outcome = await pending;
  return NextResponse.json(outcome.body, { status: outcome.status });
}
