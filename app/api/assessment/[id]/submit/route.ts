import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { enforceQuota } from '@/lib/usage/quota';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { gradingGraph } from '@/lib/langgraph/grading-graph';
import { AssessmentSubmitBodySchema, parseJsonBody } from '@/lib/validation/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import { fetchLearnerPrefs } from '@/lib/memory/preferences';
import { loadAttemptResult } from '@/lib/assessment/results';
import type { PreferredLanguage } from '@/prompts/language';

export const maxDuration = 120;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WEAK_BELOW = 50;
const RECOVERED_AT_OR_ABOVE = 75;

interface QuestionRow {
  id: string;
  question: string;
  type: 'mcq' | 'short_answer' | 'long_answer';
  correct_answer: string | null;
  model_answer: string | null;
  rubric: string | null;
  max_marks: number;
  concept: string;
  concept_id: string | null;
}

interface GradedResult {
  question: QuestionRow;
  studentAnswer: string;
  isCorrect: boolean | null;
  score: number;
  maxScore: number;
  gradingStatus: 'graded' | 'ungraded' | 'failed';
  aiFeedback: { feedback: string; strengths: string[]; improvements: string[]; confidence: number } | null;
}

function normalize(s: string) {
  return s.trim().toLowerCase();
}

/** MCQ grading is deterministic: exact match against the answer key. No AI. */
function gradeMcq(question: QuestionRow, studentAnswer: string): GradedResult {
  const isCorrect = normalize(studentAnswer) === normalize(question.correct_answer ?? '');
  return {
    question,
    studentAnswer,
    isCorrect,
    score: isCorrect ? question.max_marks : 0,
    maxScore: question.max_marks,
    gradingStatus: 'graded',
    aiFeedback: null,
  };
}

/**
 * Short-answer grading. A blank answer is scored 0 deterministically (never
 * sent to the model). A failed grading call is recorded as `failed` — never a
 * silent 0 or 100 — and excluded from both sides of the score ratio.
 */
async function gradeShortAnswer(
  question: QuestionRow,
  studentAnswer: string,
  language: PreferredLanguage
): Promise<GradedResult> {
  const trimmed = studentAnswer.trim();
  if (trimmed.length === 0) {
    return {
      question,
      studentAnswer: '',
      isCorrect: null,
      score: 0,
      maxScore: question.max_marks,
      gradingStatus: 'graded',
      aiFeedback: {
        feedback: 'No answer was submitted for this question.',
        strengths: [],
        improvements: ['Attempt every question — even a partial answer usually earns some credit.'],
        confidence: 1,
      },
    };
  }

  const result = await gradingGraph.invoke({
    question: question.question,
    studentAnswer: trimmed,
    modelAnswer: question.model_answer ?? '',
    rubric: question.rubric ?? '',
    maxMarks: question.max_marks,
    language,
  });

  if (result.error || !result.grade) {
    return {
      question,
      studentAnswer: trimmed,
      isCorrect: null,
      score: 0,
      maxScore: question.max_marks,
      gradingStatus: 'failed',
      aiFeedback: null,
    };
  }

  return {
    question,
    studentAnswer: trimmed,
    isCorrect: null,
    score: result.grade.score,
    maxScore: result.grade.maxScore,
    gradingStatus: 'graded',
    aiFeedback: {
      feedback: result.grade.feedback,
      strengths: result.grade.strengths,
      improvements: result.grade.improvements,
      confidence: result.grade.confidence,
    },
  };
}

function toResponse(result: NonNullable<Awaited<ReturnType<typeof loadAttemptResult>>>) {
  return {
    attemptId: result.attemptId,
    score: result.score,
    failedGradingCount: result.failedGradingCount,
    results: result.rows,
    weakConcepts: result.weakConcepts,
  };
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'You need to be logged in to do this.' }, { status: 401 });

  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 });

  const limited = await enforceRateLimit(user.id, 'assessment_submit');
  if (limited) return limited;

  const overQuota = await enforceQuota(user.id, 'assessment_submit');
  if (overQuota) return overQuota;

  const parsed = await parseJsonBody(request, AssessmentSubmitBodySchema);
  if (!parsed.ok) return parsed.response;
  const { answers } = parsed.data;

  // Everything below runs with the service-role client (the browser can no
  // longer write attempts/answers/scores), so every query is explicitly
  // scoped to the verified user.id.
  const admin = createServiceRoleClient();

  const { data: assessment } = await admin
    .from('assessments')
    .select('id, topic_id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!assessment) return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 });

  // Idempotent: a second submit returns the existing attempt instead of
  // grading (and paying for) the quiz again.
  const { data: existing } = await admin
    .from('assessment_attempts')
    .select('id')
    .eq('assessment_id', assessment.id)
    .eq('user_id', user.id)
    .not('submitted_at', 'is', null)
    .limit(1)
    .maybeSingle();

  if (existing) {
    const prior = await loadAttemptResult(admin, user.id, assessment.id, existing.id);
    if (prior) return NextResponse.json({ ...toResponse(prior), alreadySubmitted: true });
  }

  const { data: questionRows } = await admin
    .from('assessment_questions')
    .select('*')
    .eq('assessment_id', assessment.id)
    .order('order_index');

  if (!questionRows || questionRows.length === 0) {
    return NextResponse.json({ error: 'This assessment has no questions.' }, { status: 400 });
  }

  const { data: keys } = await admin
    .from('assessment_answer_keys')
    .select('*')
    .in(
      'question_id',
      questionRows.map((q) => q.id)
    );
  const keyById = new Map((keys ?? []).map((k) => [k.question_id, k]));

  const questions: QuestionRow[] = questionRows.map((q) => {
    const key = keyById.get(q.id);
    return {
      id: q.id,
      question: q.question,
      type: q.type,
      // Legacy rows (before answer keys moved) still carry the key on the question.
      correct_answer: key?.correct_answer ?? q.correct_answer,
      model_answer: key?.model_answer ?? q.model_answer,
      rubric: key?.rubric ?? q.rubric,
      max_marks: Number(q.max_marks ?? 1),
      concept: q.concept,
      concept_id: q.concept_id,
    };
  });

  const answerByQuestionId = new Map(answers.map((a) => [a.questionId, a.answer]));
  const prefs = await fetchLearnerPrefs(supabase, user.id);

  // MCQs grade instantly; short answers each make an LLM call, run in parallel.
  const results: GradedResult[] = await Promise.all(
    questions.map((q) => {
      const studentAnswer = answerByQuestionId.get(q.id) ?? '';
      return q.type === 'mcq' ? gradeMcq(q, studentAnswer) : gradeShortAnswer(q, studentAnswer, prefs.language);
    })
  );

  // If every real (non-blank) short answer failed to grade, the AI was almost
  // certainly down: persist NOTHING so the student can simply submit again,
  // instead of locking in a result with no grades.
  const attemptedShort = results.filter(
    (r) => r.question.type !== 'mcq' && r.studentAnswer.trim().length > 0
  );
  if (attemptedShort.length > 0 && attemptedShort.every((r) => r.gradingStatus === 'failed')) {
    return NextResponse.json(
      { error: 'Our AI grader is busy right now, so nothing was saved. Please press Submit again in a moment.' },
      { status: 503 }
    );
  }

  // Weighted score across question types; failed gradings are excluded from
  // both the numerator and denominator.
  const gradedResults = results.filter((r) => r.gradingStatus !== 'failed');
  const totalMaxScore = gradedResults.reduce((sum, r) => sum + r.maxScore, 0);
  const totalScore = gradedResults.reduce((sum, r) => sum + r.score, 0);
  const overallScore = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
  const failedCount = results.length - gradedResults.length;

  const byConcept = new Map<string, { concept: string; conceptId: string | null; score: number; maxScore: number }>();
  for (const r of gradedResults) {
    const id = r.question.concept_id ?? `name:${r.question.concept}`;
    const bucket = byConcept.get(id) ?? {
      concept: r.question.concept,
      conceptId: r.question.concept_id,
      score: 0,
      maxScore: 0,
    };
    bucket.score += r.score;
    bucket.maxScore += r.maxScore;
    byConcept.set(id, bucket);
  }

  const conceptScores = Array.from(byConcept.values()).map((c) => ({
    concept: c.concept,
    concept_id: c.conceptId,
    score: c.maxScore > 0 ? Math.round((c.score / c.maxScore) * 100) : 0,
  }));

  const weakConcepts = conceptScores.filter((c) => c.score < WEAK_BELOW).map((c) => c.concept);
  const recoveredConcepts = conceptScores.filter((c) => c.score >= RECOVERED_AT_OR_ABOVE).map((c) => c.concept);

  // One transaction: attempt + answers + performance + memory + topic status + activity.
  const { data: rpcData, error: rpcError } = await admin.rpc('submit_assessment_attempt', {
    p_user_id: user.id,
    p_assessment_id: assessment.id,
    p_score: overallScore,
    p_answers: results.map((r) => ({
      question_id: r.question.id,
      student_answer: r.studentAnswer || null,
      is_correct: r.isCorrect,
      score: r.score,
      max_score: r.maxScore,
      ai_feedback: r.aiFeedback,
      grading_status: r.gradingStatus,
    })),
    p_concept_scores: conceptScores,
    p_weak_concepts: weakConcepts,
    p_recovered_concepts: recoveredConcepts,
    p_mark_completed: overallScore >= 80 && failedCount === 0,
  });

  if (rpcError || !rpcData) {
    if (rpcError?.code === 'P0002') return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 });
    logger.error('submit_assessment_attempt failed', { error: rpcError, assessmentId: assessment.id });
    return NextResponse.json({ error: 'We could not save your results. Please try submitting again.' }, { status: 500 });
  }

  const attemptId = (rpcData as { attempt_id: string }).attempt_id;
  const saved = await loadAttemptResult(admin, user.id, assessment.id, attemptId);
  if (!saved) return NextResponse.json({ error: 'Your results were saved but could not be loaded.' }, { status: 500 });

  return NextResponse.json({
    ...toResponse(saved),
    alreadySubmitted: (rpcData as { already_submitted?: boolean }).already_submitted === true,
  });
}
