'use client';

import { useEffect } from 'react';

/**
 * Last-resort boundary for errors in the root layout itself. It replaces the
 * whole document, so it cannot rely on the app's fonts, Tailwind classes or
 * providers — styles are inline.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[app/global-error]', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#EBF4FD',
          color: '#1F3A5F',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
        }}
      >
        <div
          role="alert"
          style={{
            maxWidth: 420,
            margin: 16,
            padding: 32,
            textAlign: 'center',
            background: '#fff',
            border: '2px solid #B9D9F5',
            borderRadius: 16,
          }}
        >
          <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>Something went wrong</h1>
          <p style={{ fontSize: 14, margin: '0 0 20px', opacity: 0.8 }}>
            AI Tutor hit an unexpected problem. Your progress is safe — please reload.
          </p>
          {error.digest && <p style={{ fontSize: 11, fontFamily: 'monospace' }}>Reference: {error.digest}</p>}
          <button
            onClick={reset}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              border: '2px solid #8EBBE3',
              background: '#D7EAFB',
              color: '#1F3A5F',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
