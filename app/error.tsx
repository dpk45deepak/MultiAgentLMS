'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

/** Route-level error boundary: shown when a page throws while rendering. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[app/error]', error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-12 text-navy">
      <div
        role="alert"
        className="w-full max-w-md rounded-2xl border-2 border-[#B9D9F5] bg-white p-8 text-center shadow-window"
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[#F8C9D4] bg-[#FDEAEF] text-2xl" aria-hidden="true">
          🥀
        </div>
        <h1 className="font-heading text-xl font-bold text-navy">Something went wrong</h1>
        <p className="mt-2 font-sans text-sm font-medium text-navy-muted">
          We hit an unexpected problem loading this page. Your work is safe &mdash; please try again.
        </p>
        {error.digest && <p className="mt-2 font-mono text-[11px] text-navy-muted">Reference: {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="marker" onClick={reset}>
            Try again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
