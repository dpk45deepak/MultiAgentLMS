'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

/**
 * Generates (or, with `regenerate`, re-generates) notes for a topic.
 * Progress text is honest: it shows real elapsed time instead of fake
 * rotating "stages", because the request is one opaque server call.
 */
export function GenerateNotesButton({
  topicId,
  regenerate = false,
  compact = false,
}: {
  topicId: string;
  regenerate?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  async function handleGenerate() {
    if (startedRef.current) return; // hard guard against double-clicks
    if (regenerate && !window.confirm('Replace these notes with a freshly generated version?')) return;

    startedRef.current = true;
    setError(null);
    setLoading(true);
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);

    try {
      const res = await fetch('/api/notes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, regenerate }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'Something went wrong while generating notes.');
        startedRef.current = false;
        setLoading(false);
      } else {
        // Stay disabled until the refreshed page replaces this button.
        router.refresh();
      }
    } catch {
      setError('We couldn\u2019t reach the server. Please try again.');
      startedRef.current = false;
      setLoading(false);
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }

  const label = loading ? (
    <>
      <Loader2 className="animate-spin" size={16} /> Generating notes&hellip; {elapsed}s (usually under a minute)
    </>
  ) : regenerate ? (
    <>
      <RefreshCw size={15} /> Regenerate notes
    </>
  ) : (
    <>
      <Sparkles size={16} /> Generate notes
    </>
  );

  if (compact) {
    return (
      <div className="flex flex-col items-start gap-2">
        <Button type="button" variant="outline" onClick={handleGenerate} disabled={loading} className="shadow-xs">
          {label}
        </Button>
        {error && <Alert variant="destructive">{error}</Alert>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-3 rounded border border-dashed border-line bg-paper-raised px-6 py-10">
      <p className="font-serif text-base text-ink">No notes yet for this topic</p>
      <p className="text-sm text-ink-soft">
        Your tutor will generate a full set of structured notes — definitions, workings, exam points, and common
        mistakes.
      </p>
      {error && (
        <Alert variant="destructive" className="w-full">
          {error}
        </Alert>
      )}
      <Button onClick={handleGenerate} disabled={loading}>
        {label}
      </Button>
    </div>
  );
}
