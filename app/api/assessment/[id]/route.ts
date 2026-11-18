import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'You need to be logged in to do this.' }, { status: 401 });

  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 });

  // Only non-key columns are selectable by the browser role (migration 004);
  // answer keys live in assessment_answer_keys, readable server-side only.
  const { data: assessment, error } = await supabase
    .from('assessments')
    .select(
      'id, difficulty, topic_id, topics(name), assessment_questions(id, question, type, options, max_marks, order_index), assessment_attempts(id, submitted_at)'
    )
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (error || !assessment) {
    return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 });
  }

  // Already finished? Tell the UI so it can open the result instead of letting
  // the student re-answer a quiz whose attempt is final.
  const submitted = ((assessment as unknown as { assessment_attempts: { id: string; submitted_at: string | null }[] | null })
    .assessment_attempts ?? []).find((a) => a.submitted_at);

  const questions = (
    assessment.assessment_questions as unknown as {
      id: string;
      question: string;
      type: 'mcq' | 'short_answer' | 'long_answer';
      options: string[] | null;
      max_marks: number;
      order_index: number;
    }[]
  )
    .sort((a, b) => a.order_index - b.order_index)
    .map((q) => ({ id: q.id, type: q.type, question: q.question, options: q.options, maxMarks: q.max_marks }));

  return NextResponse.json({
    id: assessment.id,
    difficulty: assessment.difficulty,
    topicId: assessment.topic_id,
    topicName: (assessment.topics as unknown as { name: string } | null)?.name ?? 'General',
    questions,
    submittedAttemptId: submitted?.id ?? null,
  });
}
