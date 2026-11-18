'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PinButton } from '@/components/ui/pin-button';

const SHORT_ANSWER_CHAR_LIMIT = 2000;

interface Question {
  id: string;
  type: 'mcq' | 'short_answer' | 'long_answer';
  question: string;
  options: string[] | null;
  maxMarks: number;
}

const storageKey = (assessmentId: string) => `quiz-answers:${assessmentId}`;

export function TestRunner({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  const [topicName, setTopicName] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const submittingRef = useRef(false);
  const restoredRef = useRef(false);

  useEffect(() => {
    fetch(`/api/assessment/${assessmentId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        // Already submitted (e.g. back button): go straight to the result.
        if (data.submittedAttemptId) {
          router.replace(`/assessment/${assessmentId}/result?attempt=${data.submittedAttemptId}`);
          return;
        }
        setQuestions(data.questions);
        setTopicName(data.topicName);
        setDifficulty(data.difficulty);

        // Restore in-progress answers after a refresh (only for ids that still exist).
        try {
          const saved = sessionStorage.getItem(storageKey(assessmentId));
          if (saved) {
            const parsed = JSON.parse(saved) as { answers?: Record<string, string>; index?: number };
            const valid = new Set((data.questions as Question[]).map((q) => q.id));
            const restored = Object.fromEntries(
              Object.entries(parsed.answers ?? {}).filter(([id, v]) => valid.has(id) && typeof v === 'string')
            );
            setAnswers(restored);
            if (typeof parsed.index === 'number' && parsed.index >= 0 && parsed.index < data.questions.length) {
              setIndex(parsed.index);
            }
          }
        } catch {
          /* storage unavailable or corrupted: start fresh */
        }
        restoredRef.current = true;
      })
      .catch(() => setError('We couldn\u2019t load this assessment.'));
  }, [assessmentId, router]);

  // Autosave (only after the restore step, so we never overwrite saved answers with an empty state).
  useEffect(() => {
    if (!restoredRef.current) return;
    try {
      sessionStorage.setItem(storageKey(assessmentId), JSON.stringify({ answers, index }));
    } catch {
      /* quota / private mode */
    }
  }, [answers, index, assessmentId]);

  const setAnswer = useCallback((questionId: string, value: string) => {
    setAnswers((a) => ({ ...a, [questionId]: value }));
  }, []);

  // Keyboard: 1-4 picks an MCQ option (ignored while typing in a text field).
  useEffect(() => {
    if (!questions) return;
    const q = questions[index];
    if (!q || q.type !== 'mcq') return;

    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'radio')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= (q.options?.length ?? 0)) {
        setAnswer(q.id, q.options![n - 1]);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [questions, index, setAnswer]);

  async function submit() {
    if (!questions || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/assessment/${assessmentId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: questions.map((q) => ({ questionId: q.id, answer: answers[q.id] ?? '' })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not submit your answers.');
        submittingRef.current = false;
        setSubmitting(false);
        setConfirming(false);
        return;
      }
      try {
        sessionStorage.removeItem(storageKey(assessmentId));
      } catch {
        /* ignore */
      }
      // Success: stay disabled (submitting stays true) until the result page loads.
      router.push(`/assessment/${assessmentId}/result?attempt=${data.attemptId}`);
    } catch {
      setError('We couldn\u2019t reach the server. Your answers are saved on this device — please try again.');
      submittingRef.current = false;
      setSubmitting(false);
      setConfirming(false);
    }
  }

  if (error && !questions) {
    return <Alert variant="destructive">{error}</Alert>;
  }

  if (!questions) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const current = questions[index];
  const currentAnswer = answers[current.id] ?? '';
  const isAnswered = (q: Question) => (answers[q.id] ?? '').trim().length > 0;
  const answeredCount = questions.filter(isAnswered).length;
  const unanswered = questions.length - answeredCount;
  const isLast = index === questions.length - 1;

  return (
    <div className="flex flex-col gap-6 text-navy">
      {/* Header Info & progress */}
      <div className="flex flex-col gap-2 rounded-2xl border-2 border-[#D7EAFB] bg-white p-4 shadow-card">
        <div className="flex items-center justify-between font-heading text-xs font-bold text-navy-muted">
          <div className="flex items-center gap-2">
            <span>
              {topicName} &middot; <span className="capitalize">{difficulty}</span>
            </span>
            <PinButton
              id={`assessment-${assessmentId}`}
              title={`Quiz: ${topicName || 'Assessment'}`}
              type="assessment"
              href={`/assessment/${assessmentId}`}
              badge={difficulty}
              compact
            />
          </div>
          <span>
            Question {index + 1} of {questions.length} &middot; {answeredCount} answered
          </span>
        </div>

        <div
          className="h-2.5 w-full overflow-hidden rounded-full border border-[#D7EAFB] bg-[#EBF4FD]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={answeredCount}
          aria-label="Questions answered"
        >
          <div
            className="h-full bg-gradient-to-r from-[#B9D9F5] via-[#FFE9A8] to-[#F8C9D4] transition-all duration-300"
            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
          />
        </div>

        {/* Question navigator */}
        <nav aria-label="Question navigator" className="mt-1 flex flex-wrap gap-1.5">
          {questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={() => {
                setIndex(i);
                setConfirming(false);
              }}
              aria-label={`Question ${i + 1}${isAnswered(q) ? ', answered' : ', not answered'}`}
              aria-current={i === index ? 'step' : undefined}
              className={`h-8 w-8 rounded-lg border-2 font-heading text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3D82C4] ${
                i === index
                  ? 'border-[#3D82C4] bg-[#D7EAFB] text-navy'
                  : isAnswered(q)
                    ? 'border-[#D6EAD6] bg-[#EDF7ED] text-navy'
                    : 'border-[#D7EAFB] bg-white text-navy-muted hover:bg-[#F4F9FE]'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </nav>
      </div>

      {/* Question Card */}
      <div className="washi-tape washi-tape-yellow rounded-2xl border-2 border-[#B9D9F5] bg-white p-6 shadow-window sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-3">
          <p id="question-text" className="font-heading text-lg font-bold leading-snug text-navy sm:text-xl">
            {current.question}
          </p>
          {current.type === 'short_answer' && (
            <Badge variant="highlight" className="shrink-0">
              {current.maxMarks} mark{current.maxMarks !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {current.type === 'mcq' ? (
          <div role="radiogroup" aria-labelledby="question-text" className="flex flex-col gap-3">
            {(current.options ?? []).map((option, i) => {
              const selected = currentAnswer === option;
              return (
                <label
                  key={option}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3.5 font-sans text-sm font-semibold transition-all duration-150 focus-within:ring-2 focus-within:ring-[#3D82C4] ${
                    selected
                      ? 'translate-x-1 border-[#B9D9F5] bg-[#D7EAFB] text-navy shadow-xs'
                      : 'border-[#D7EAFB] bg-[#FFFDF9] text-navy hover:border-[#B9D9F5] hover:bg-[#F4F9FE]'
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${current.id}`}
                    value={option}
                    checked={selected}
                    onChange={() => setAnswer(current.id, option)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[#8EBBE3] bg-white text-[10px] font-bold text-navy-muted"
                  >
                    {i + 1}
                  </span>
                  <span>{option}</span>
                </label>
              );
            })}
            <p className="font-sans text-xs font-semibold text-navy-muted">Tip: press 1&ndash;{current.options?.length ?? 4} to choose.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Textarea
              value={currentAnswer}
              maxLength={SHORT_ANSWER_CHAR_LIMIT}
              aria-labelledby="question-text"
              placeholder="Type your answer here… a few sentences is usually enough."
              onChange={(e) => setAnswer(current.id, e.target.value)}
              rows={6}
            />
            <p className="self-end font-sans text-xs font-semibold text-navy-muted">
              {currentAnswer.length}/{SHORT_ANSWER_CHAR_LIMIT}
            </p>
          </div>
        )}
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      {confirming && (
        <div role="alertdialog" aria-labelledby="confirm-title" className="rounded-2xl border-2 border-[#FFE9A8] bg-[#FFF8E1] p-5 shadow-xs">
          <p id="confirm-title" className="font-heading text-base font-bold text-navy">
            Ready to submit?
          </p>
          <p className="mt-1 font-sans text-sm font-medium text-navy-muted">
            {unanswered > 0
              ? `You have ${unanswered} unanswered question${unanswered !== 1 ? 's' : ''}. Unanswered questions score zero.`
              : 'You have answered every question. Your answers are final once submitted.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={submitting}>
              Keep working
            </Button>
            <Button variant="marker" onClick={submit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Grading answers&hellip;
                </>
              ) : (
                'Yes, submit quiz'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={index === 0 || submitting} onClick={() => setIndex((i) => i - 1)}>
          &larr; Previous
        </Button>
        {!isLast ? (
          <Button onClick={() => setIndex((i) => i + 1)} disabled={submitting}>
            Next Question &rarr;
          </Button>
        ) : (
          <Button variant="marker" onClick={() => setConfirming(true)} disabled={submitting || confirming}>
            Review &amp; submit
          </Button>
        )}
      </div>
    </div>
  );
}
