import type { AdminClient } from '@/lib/supabase/admin';

export interface AttemptResultRow {
  questionId: string;
  question: string;
  type: 'mcq' | 'short_answer' | 'long_answer';
  options: string[] | null;
  /** Answer key — only ever present in a payload built after submission. */
  correctAnswer: string | null;
  explanation: string | null;
  concept: string;
  studentAnswer: string | null;
  isCorrect: boolean | null;
  score: number;
  maxScore: number;
  gradingStatus: 'graded' | 'ungraded' | 'failed';
  aiFeedback: { feedback: string; strengths: string[]; improvements: string[]; confidence: number } | null;
}

export interface AttemptResult {
  attemptId: string;
  assessmentId: string;
  score: number;
  difficulty: string;
  topic: { id: string; name: string } | null;
  rows: AttemptResultRow[];
  weakConcepts: string[];
  failedGradingCount: number;
}

/**
 * Loads a SUBMITTED attempt with its answer key. This is the only place the
 * key is joined back onto a student-facing payload, and it runs server-side
 * with the service-role client: the attempt must belong to `userId` and must
 * already be submitted, so a student can never read keys for a quiz they
 * have not finished.
 */
export async function loadAttemptResult(
  admin: AdminClient,
  userId: string,
  assessmentId: string,
  attemptId: string
): Promise<AttemptResult | null> {
  const { data: attempt } = await admin
    .from('assessment_attempts')
    .select('id, score, assessment_id, submitted_at')
    .eq('id', attemptId)
    .eq('user_id', userId)
    .eq('assessment_id', assessmentId)
    .not('submitted_at', 'is', null)
    .maybeSingle();
  if (!attempt) return null;

  const { data: assessment } = await admin
    .from('assessments')
    .select('id, topic_id, difficulty')
    .eq('id', assessmentId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!assessment) return null;

  const [{ data: topic }, { data: questions }, { data: answers }] = await Promise.all([
    admin.from('topics').select('id, name').eq('id', assessment.topic_id).eq('user_id', userId).maybeSingle(),
    admin.from('assessment_questions').select('*').eq('assessment_id', assessmentId).order('order_index'),
    admin
      .from('assessment_answers')
      .select('question_id, student_answer, is_correct, score, max_score, ai_feedback, grading_status')
      .eq('attempt_id', attemptId),
  ]);

  const questionIds = (questions ?? []).map((q) => q.id);
  const { data: keys } = questionIds.length
    ? await admin.from('assessment_answer_keys').select('*').in('question_id', questionIds)
    : { data: [] };
  const keyById = new Map((keys ?? []).map((k) => [k.question_id, k]));
  const answerById = new Map((answers ?? []).map((a) => [a.question_id, a]));

  const rows: AttemptResultRow[] = (questions ?? []).map((q) => {
    const a = answerById.get(q.id);
    const key = keyById.get(q.id);
    return {
      questionId: q.id,
      question: q.question,
      type: q.type,
      options: q.options,
      // Fall back to the legacy columns for assessments created before answer keys moved.
      correctAnswer: key?.correct_answer ?? q.correct_answer ?? null,
      explanation: key?.explanation ?? q.explanation ?? null,
      concept: q.concept,
      studentAnswer: a?.student_answer ?? null,
      isCorrect: a?.is_correct ?? null,
      score: Number(a?.score ?? 0),
      maxScore: Number(a?.max_score ?? q.max_marks ?? 1),
      gradingStatus: (a?.grading_status as AttemptResultRow['gradingStatus']) ?? 'ungraded',
      aiFeedback: (a?.ai_feedback as AttemptResultRow['aiFeedback']) ?? null,
    };
  });

  const graded = rows.filter((r) => r.gradingStatus !== 'failed');
  const byConcept = new Map<string, { score: number; max: number }>();
  for (const r of graded) {
    const bucket = byConcept.get(r.concept) ?? { score: 0, max: 0 };
    bucket.score += r.score;
    bucket.max += r.maxScore;
    byConcept.set(r.concept, bucket);
  }
  const weakConcepts = Array.from(byConcept.entries())
    .filter(([, b]) => b.max > 0 && b.score / b.max < 0.5)
    .map(([concept]) => concept);

  return {
    attemptId: attempt.id,
    assessmentId,
    score: Number(attempt.score ?? 0),
    difficulty: assessment.difficulty,
    topic: topic ?? null,
    rows,
    weakConcepts,
    failedGradingCount: rows.length - graded.length,
  };
}
