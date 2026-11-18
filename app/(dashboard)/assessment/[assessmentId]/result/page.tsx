import Link from 'next/link';
import { CheckCircle2, XCircle, Sparkles, AlertTriangle, ThumbsUp, ArrowUpCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { loadAttemptResult } from '@/lib/assessment/results';
import { scoreMessage } from '@/lib/assessment/utils';
import { StartTestButton } from '@/components/assessment/StartTestButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { ErrorState } from '@/components/ui/error-state';

export default async function AssessmentResultPage({
  params,
  searchParams,
}: {
  params: { assessmentId: string };
  searchParams: { attempt?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const attemptId = searchParams.attempt;
  if (!attemptId) {
    return <div className="mx-auto w-full max-w-5xl xl:max-w-6xl px-4 py-8 text-sm text-ink-soft sm:px-6 sm:py-10 lg:px-8 xl:px-10">No attempt specified.</div>;
  }

  // Answer keys are joined back on server-side only, and only for an attempt
  // that belongs to this user AND is already submitted.
  let result;
  try {
    result = await loadAttemptResult(createServiceRoleClient(), user.id, params.assessmentId, attemptId);
  } catch (err) {
    console.error('loadAttemptResult failed', err);
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <ErrorState message="We couldn\u2019t load this result. Please refresh in a moment." />
      </div>
    );
  }

  if (!result) {
    return <div className="mx-auto w-full max-w-5xl xl:max-w-6xl px-4 py-8 text-sm text-ink-soft sm:px-6 sm:py-10 lg:px-8 xl:px-10">Result not found.</div>;
  }

  const topic = result.topic;
  const attempt = { score: result.score };
  const rows = result.rows;
  const gradedRows = rows.filter((r) => r.gradingStatus !== 'failed');
  const failedRows = rows.filter((r) => r.gradingStatus === 'failed');
  const weakConcepts = result.weakConcepts;
  const message = scoreMessage(attempt.score);

  return (
    <div className="mx-auto w-full max-w-5xl xl:max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10 text-navy">
      {/* Result Stamp Card with Washi Tape */}
      <div className="relative mb-8 rounded-2xl border-2 border-[#B9D9F5] bg-white p-6 text-center shadow-window washi-tape washi-tape-yellow">
        <p className="font-heading text-xs font-bold uppercase tracking-wide text-navy-muted">{topic?.name}</p>
        <div className="my-2 inline-flex items-center gap-2">
          <span className="text-3xl" aria-hidden="true">{message.emoji}</span>
          <p className="font-heading text-5xl font-bold text-navy">{attempt.score}%</p>
        </div>
        <p className="font-heading text-base font-bold text-navy">{message.headline}</p>
        <p className="mx-auto mb-1 max-w-md font-sans text-xs font-medium text-navy-muted">{message.body}</p>
        <p className="font-sans text-xs font-semibold text-navy-muted">
          Score: {gradedRows.reduce((sum, r) => sum + r.score, 0)} / {gradedRows.reduce((sum, r) => sum + r.maxScore, 0)} marks
        </p>
      </div>

      {failedRows.length > 0 && (
        <Alert variant="destructive" className="mb-6 flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            {failedRows.length} short-answer question{failedRows.length !== 1 ? 's' : ''} couldn&rsquo;t be graded right
            now. You can retake the quiz to get a full score.
          </span>
        </Alert>
      )}

      {weakConcepts.length > 0 && (
        <div className="mb-8 rounded-2xl border-2 border-[#F8C9D4] bg-[#FDEAEF] p-5 shadow-xs">
          <p className="mb-2 font-heading text-base font-bold text-navy">Recommended revision topics:</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {weakConcepts.map((c) => (
              <Badge key={c} variant="flag">
                {c}
              </Badge>
            ))}
          </div>
          {topic && (
            <Button size="sm" variant="marker" asChild>
              <Link href={`/tutor?topicId=${topic.id}`}>Ask your tutor about these &rarr;</Link>
            </Button>
          )}
        </div>
      )}

      {/* Answer Review List */}
      <div className="flex flex-col gap-4">
        {rows.map((row, i) => {
          const q = row;
          if (q.type === 'mcq') {
            return (
              <div key={i} className="rounded-2xl border-2 border-[#D7EAFB] bg-white p-5 shadow-xs">
                <div className="mb-3 flex items-start gap-2.5">
                  {row.isCorrect ? (
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#388E3C]" />
                  ) : (
                    <XCircle size={18} className="mt-0.5 shrink-0 text-[#E11D48]" />
                  )}
                  <p className="font-heading text-sm font-bold text-navy">{q.question}</p>
                </div>
                <div className="ml-7 flex flex-col gap-1.5 text-xs font-semibold">
                  {(q.options ?? []).map((opt) => (
                    <div
                      key={opt}
                      className={`rounded-xl border px-3 py-2 ${
                        opt === q.correctAnswer
                          ? 'border-[#D6EAD6] bg-[#EDF7ED] text-[#24364B]'
                          : opt === row.studentAnswer
                            ? 'border-[#F8C9D4] bg-[#FDEAEF] text-[#24364B]'
                            : 'border-transparent text-navy-muted'
                      }`}
                    >
                      {opt}
                    </div>
                  ))}
                  <p className="mt-2 font-sans text-xs font-medium text-navy-muted">{q.explanation}</p>
                </div>
              </div>
            );
          }

          // Short-answer question
          return (
            <div key={i} className="rounded-2xl border-2 border-[#D7EAFB] bg-white p-5 shadow-xs">
              <div className="mb-3 flex items-start justify-between gap-3">
                <p className="font-heading text-sm font-bold text-navy">{q.question}</p>
                {row.gradingStatus === 'graded' && (
                  <Badge variant="highlight" className="shrink-0">
                    {row.score}/{row.maxScore}
                  </Badge>
                )}
              </div>

              <div className="flex flex-col gap-3 font-sans text-xs">
                <div className="rounded-xl border border-[#D7EAFB] bg-[#FFFDF9] px-3.5 py-2.5 text-navy font-semibold">
                  {row.studentAnswer || <span className="italic text-navy-muted">No answer submitted</span>}
                </div>

                {row.gradingStatus === 'failed' ? (
                  <p className="flex items-center gap-1.5 text-xs font-bold text-[#E11D48]">
                    <AlertTriangle size={13} /> This answer couldn&rsquo;t be graded automatically.
                  </p>
                ) : (
                  row.aiFeedback && (
                    <div className="rounded-xl border-2 border-[#D7EAFB] bg-[#F4F9FE] p-3.5">
                      <p className="mb-1.5 flex items-center gap-1.5 font-heading text-[11px] font-bold uppercase tracking-wider text-[#3D82C4]">
                        <Sparkles size={12} /> AI Tutor Feedback
                      </p>
                      <p className="text-navy font-medium leading-relaxed">{row.aiFeedback.feedback}</p>
                      {row.aiFeedback.strengths.length > 0 && (
                        <div className="mt-2 flex items-start gap-1.5 text-xs font-bold text-[#388E3C]">
                          <ThumbsUp size={12} className="mt-0.5 shrink-0" />
                          <span>{row.aiFeedback.strengths.join(' \u00b7 ')}</span>
                        </div>
                      )}
                      {row.aiFeedback.improvements.length > 0 && (
                        <div className="mt-1 flex items-start gap-1.5 text-xs font-bold text-[#D97706]">
                          <ArrowUpCircle size={12} className="mt-0.5 shrink-0" />
                          <span>{row.aiFeedback.improvements.join(' \u00b7 ')}</span>
                        </div>
                      )}
                    </div>
                  )
                )}
                <p className="font-sans text-xs font-medium text-navy-muted">{q.explanation}</p>
              </div>
            </div>
          );
        })}
      </div>

      {topic && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <StartTestButton topicId={topic.id} compact forceNew label="Retake quiz" variant="marker" />
          <Button variant="outline" asChild>
            <Link href={`/learn/${topic.id}`}>&larr; Back to topic notes</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
