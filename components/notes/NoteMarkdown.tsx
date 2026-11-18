import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Children, type ReactNode } from 'react';
import { MermaidDiagram } from './MermaidDiagram';
import { Highlighted } from './NoteSection';

/** Highlights search matches in plain-text children only (code/diagrams are left untouched). */
function withHighlight(children: ReactNode, query?: string): ReactNode {
  if (!query) return children;
  return Children.map(children, (child) =>
    typeof child === 'string' ? <Highlighted text={child} query={query} /> : child
  );
}

export function NoteMarkdown({ content, highlight }: { content: string; highlight?: string }) {
  return (
    <div className="prose-notes">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h3 className="mb-2.5 mt-5 font-serif text-lg font-bold text-ink tracking-tight" {...p} />,
          h2: (p) => <h4 className="mb-2 mt-4 font-serif text-base font-bold text-ink" {...p} />,
          h3: (p) => <h5 className="mb-1.5 mt-3 text-sm font-semibold text-brand-700" {...p} />,
          p: ({ children, ...p }) => <p className="mb-3.5 text-[15px] leading-relaxed text-ink-soft" {...p}>{withHighlight(children, highlight)}</p>,
          ul: (p) => <ul className="mb-4 ml-5 list-disc space-y-1.5 text-[15px] leading-relaxed text-ink-soft marker:text-brand-500" {...p} />,
          ol: (p) => <ol className="mb-4 ml-5 list-decimal space-y-1.5 text-[15px] leading-relaxed text-ink-soft marker:text-brand-600" {...p} />,
          li: ({ children, ...p }) => <li className="pl-1" {...p}>{withHighlight(children, highlight)}</li>,
          blockquote: (p) => (
            <blockquote className="my-4 rounded-r-xl border-l-4 border-brand-500 bg-brand-50/50 p-4 text-[14px] italic text-ink-soft shadow-xs" {...p} />
          ),
          strong: ({ children, ...p }) => <strong className="font-semibold text-ink" {...p}>{withHighlight(children, highlight)}</strong>,
          table: (p) => (
            <div className="my-4 overflow-x-auto rounded-xl border border-line bg-white shadow-xs">
              <table className="w-full border-collapse text-left text-sm" {...p} />
            </div>
          ),
          th: (p) => <th className="border-b border-line bg-slate-50/90 px-4 py-3 font-semibold text-ink text-xs uppercase tracking-wider" {...p} />,
          td: ({ children, ...p }) => <td className="border-b border-line/60 px-4 py-3 text-ink-soft last:border-b-0 leading-normal" {...p}>{withHighlight(children, highlight)}</td>,
          code: ({ className, children, ...rest }) => {
            const isBlock = className?.includes('language-');
            if (!isBlock) {
              return (
                <code className="rounded-md border border-slate-200/80 bg-slate-100/80 px-1.5 py-0.5 font-mono text-[13px] font-medium text-brand-700" {...rest}>
                  {children}
                </code>
              );
            }
            const isMermaid = className?.includes('language-mermaid');
            const rawCode = String(children).replace(/\n$/, '');

            if (isMermaid) {
              return <MermaidDiagram code={rawCode} />;
            }

            const lang = className?.replace('language-', '') || 'code';

            return (
              <div className="my-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60 px-4 py-1.5 text-xs font-mono text-slate-400">
                  <span className="uppercase text-[11px] font-semibold tracking-wider text-slate-400">{lang}</span>
                </div>
                <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-slate-100">
                  <code className="font-mono">{children}</code>
                </pre>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
