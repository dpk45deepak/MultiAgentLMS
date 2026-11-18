'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Starts (or resumes) a quiz for one topic.
 *
 * The button stays disabled from the click until navigation completes — it is
 * deliberately NOT re-enabled on success — and a ref guards against a second
 * click landing in the same tick, so a double-click can never generate (and
 * bill for) two quizzes.
 */
export function StartTestButton({
  topicId,
  label = 'Start practice quiz',
  compact = false,
  forceNew = false,
  icon,
  variant,
}: {
  topicId: string;
  label?: string;
  /** Hides the "include short answers" checkbox (e.g. on the topic page). */
  compact?: boolean;
  /** Always generate a new quiz instead of resuming an unfinished one (used for "Retake"). */
  forceNew?: boolean;
  icon?: React.ReactNode;
  variant?: 'marker' | 'outline' | 'default';
}) {
  const router = useRouter();
  const [includeShortAnswer, setIncludeShortAnswer] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  async function handleStart() {
    if (startedRef.current) return;
    startedRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/assessment/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, difficulty: 'adaptive', includeShortAnswer, forceNew }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not generate a test.');
        startedRef.current = false;
        setLoading(false);
        return;
      }
      // Success: keep `loading` true; the page is navigating away.
      router.push(`/assessment/${data.assessmentId}`);
    } catch {
      setError('We couldn\u2019t reach the server.');
      startedRef.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
      {!compact && (
        <label className="flex cursor-pointer items-center gap-2 font-heading text-xs font-bold text-navy-muted">
          <input
            type="checkbox"
            checked={includeShortAnswer}
            onChange={(e) => setIncludeShortAnswer(e.target.checked)}
            disabled={loading}
            className="h-4 w-4 cursor-pointer rounded border-2 border-[#B9D9F5] text-[#3D82C4] focus:ring-0"
          />
          <span>Include short answers</span>
        </label>
      )}
      <Button
        variant={variant ?? (compact ? 'outline' : 'marker')}
        size={compact ? 'default' : 'sm'}
        onClick={handleStart}
        disabled={loading}
        className="w-full shadow-xs sm:w-auto"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={14} /> Preparing your quiz&hellip;
          </>
        ) : (
          <span className="flex items-center gap-2">
            {icon}
            {label}
          </span>
        )}
      </Button>
      {error && <p role="alert" className="font-heading text-xs font-bold text-[#E57388]">{error}</p>}
    </div>
  );
}
