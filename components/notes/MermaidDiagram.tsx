'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, Code2 } from 'lucide-react';

/**
 * Renders a fenced ```mermaid code block (from AI-generated notes/tutor
 * replies) as an actual SVG diagram, instead of the raw text the notes
 * reader used to show.
 *
 * Design notes (Feature 1 — see docs/ENHANCEMENT_PLAN.md):
 * - `mermaid` is imported dynamically inside an effect, never at module
 *   scope, because it touches `document` and breaks server rendering.
 * - `securityLevel: 'strict'` is set explicitly (mermaid's own default is
 *   already 'strict', but we never want a future mermaid upgrade to change
 *   that default under us) — this sanitizes generated SVG/HTML and disables
 *   `<script>`/click-binding execution, so AI-generated diagram text can
 *   never run arbitrary JavaScript in the notes page.
 * - Invalid Mermaid syntax (the model occasionally produces syntax errors,
 *   especially for less common diagram types) never throws past this
 *   component: it falls back to showing the original text as a plain code
 *   block, exactly like the pre-Feature-1 behavior, plus a small notice.
 * - One mermaid instance is shared and configured once per page (module-level
 *   flag) — re-initializing per diagram is unnecessary and slightly slower.
 */

let mermaidInitPromise: Promise<typeof import('mermaid')['default']> | null = null;

function getMermaid() {
  if (!mermaidInitPromise) {
    mermaidInitPromise = import('mermaid').then((mod) => {
      const mermaid = mod.default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'base',
        fontFamily: 'var(--font-sans), system-ui, sans-serif',
        themeVariables: {
          primaryColor: '#EEF2FF',
          primaryTextColor: '#0F172A',
          primaryBorderColor: '#6366F1',
          lineColor: '#64748B',
          secondaryColor: '#FEF3C7',
          tertiaryColor: '#F8FAFC',
          background: '#FFFFFF',
          mainBkg: '#EEF2FF',
          textColor: '#0F172A',
          nodeBorder: '#4F46E5',
          clusterBkg: '#F8FAFC',
          clusterBorder: '#CBD5E1',
          edgeLabelBackground: '#FFFFFF',
        },
      });
      return mermaid;
    });
  }
  return mermaidInitPromise;
}

type RenderState =
  | { status: 'loading' }
  | { status: 'ready'; svg: string }
  | { status: 'error'; message: string };

export function MermaidDiagram({ code }: { code: string }) {
  const rawId = useId();
  // Mermaid element ids must start with a letter and contain no colons
  // (useId() produces values like ":r4:").
  const diagramId = `mermaid-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const [state, setState] = useState<RenderState>({ status: 'loading' });
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    setState({ status: 'loading' });

    const trimmed = code.trim();
    if (!trimmed) {
      setState({ status: 'error', message: 'Empty diagram.' });
      return;
    }

    getMermaid()
      .then(async (mermaid) => {
        // parse() throws a descriptive error on invalid syntax without
        // touching the DOM — used as a fast, side-effect-free validity check.
        await mermaid.parse(trimmed);
        const { svg } = await mermaid.render(diagramId, trimmed);
        if (!cancelled.current) setState({ status: 'ready', svg });
      })
      .catch((err: unknown) => {
        if (cancelled.current) return;
        const message =
          err instanceof Error ? err.message.split('\n')[0] : 'This diagram could not be rendered.';
        setState({ status: 'error', message });
      });

    return () => {
      cancelled.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, diagramId]);

  if (state.status === 'loading') {
    return (
      <div className="mb-3 flex items-center gap-2 rounded border border-line bg-line-soft/60 px-4 py-6 text-xs text-ink-faint">
        <span className="h-3 w-3 animate-pulse rounded-full bg-marker/40" />
        Rendering diagram&hellip;
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="mb-3 overflow-hidden rounded border border-flag/25 bg-flag-soft/40">
        <div className="flex items-center gap-2 border-b border-flag/20 px-4 py-2 text-xs text-flag">
          <AlertTriangle size={13} />
          Diagram couldn&rsquo;t be rendered ({state.message}) — showing the raw source instead.
        </div>
        <pre className="overflow-x-auto px-4 py-3 text-[13px] text-ink-soft">
          <code className="font-mono">{code}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="my-4 overflow-x-auto rounded-xl border border-line bg-paper-raised p-5 shadow-xs">
      <div className="mb-3 flex items-center justify-between border-b border-line pb-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-brand-700">
          <Code2 size={15} className="text-brand-600" />
          <span>Interactive Architecture Diagram</span>
        </div>
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700 border border-brand-200/60">
          Workflow Visualization
        </span>
      </div>
      <div className="py-2 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: state.svg }} />
    </div>
  );
}
