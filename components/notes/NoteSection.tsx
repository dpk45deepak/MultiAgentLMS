'use client';

import { useState } from 'react';
import {
  ChevronDown,
  Copy,
  Check,
  BookOpen,
  Sparkles,
  HelpCircle,
  FileText,
  Lightbulb,
  CheckCircle2,
  Workflow,
  Cpu,
} from 'lucide-react';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { NoteMarkdown } from './NoteMarkdown';
import { cn } from '@/lib/utils';

function getSectionIcon(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes('overview') || lower.includes('intro')) return BookOpen;
  if (lower.includes('architecture') || lower.includes('blueprint')) return Cpu;
  if (lower.includes('workflow') || lower.includes('flow') || lower.includes('diagram')) return Workflow;
  if (lower.includes('feature') || lower.includes('concept') || lower.includes('key')) return Sparkles;
  if (lower.includes('ambiguity') || lower.includes('challenge') || lower.includes('question')) return HelpCircle;
  if (lower.includes('solution') || lower.includes('tip') || lower.includes('best practice')) return Lightbulb;
  if (lower.includes('summary') || lower.includes('conclusion') || lower.includes('takeaway')) return CheckCircle2;
  return FileText;
}

export function NoteSection({
  title,
  content,
  index,
  defaultOpen = false,
  isOpen,
  onToggle,
  highlight,
  askTutorHref,
}: {
  title: string;
  content: string;
  index?: number;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  /** Search text to highlight inside this section's title and body. */
  highlight?: string;
  /** Opens the tutor with this section as context. */
  askTutorHref?: string;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const toggle = onToggle || (() => setInternalOpen((o) => !o));
  const [copied, setCopied] = useState(false);

  const IconComponent = getSectionIcon(title);
  const indexStr = index !== undefined ? String(index + 1).padStart(2, '0') : null;

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      id={`section-${index !== undefined ? index : title.replace(/\s+/g, '-').toLowerCase()}`}
      className={cn(
        'group rounded-2xl border-2 bg-white shadow-xs transition-all duration-200 overflow-hidden',
        open ? 'border-[#B9D9F5] shadow-card' : 'border-[#D7EAFB] hover:border-[#B9D9F5]'
      )}
    >
      <button
        type="button"
        onClick={toggle}
        className={cn(
          'flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors',
          open ? 'bg-[#F4F9FE] border-b-2 border-[#D7EAFB]' : 'hover:bg-[#FFFDF9]'
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          {indexStr && (
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-heading text-xs font-bold transition-colors',
                open ? 'bg-[#B9D9F5] text-navy border border-[#8EBBE3]' : 'bg-[#EBF4FD] text-navy-muted'
              )}
            >
              {indexStr}
            </span>
          )}
          <div className="flex min-w-0 items-center gap-2">
            <IconComponent
              size={17}
              className={cn(
                'shrink-0 transition-colors',
                open ? 'text-[#3D82C4]' : 'text-navy-muted group-hover:text-navy'
              )}
            />
            <span className="font-heading text-sm font-bold text-navy sm:text-base truncate">
              <Highlighted text={title} query={highlight} />
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            role="button"
            tabIndex={0}
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 font-heading text-xs font-bold text-navy-muted transition-colors hover:bg-white hover:text-navy border border-transparent hover:border-[#D7EAFB]"
            aria-label={`Copy ${title} section`}
          >
            {copied ? (
              <>
                <Check size={13} className="text-[#388E3C]" />
                <span className="text-[#388E3C] font-bold hidden sm:inline">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </span>
          <div
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg text-navy-muted transition-transform duration-200',
              open ? 'rotate-180 text-navy bg-[#D7EAFB]' : 'group-hover:text-navy'
            )}
          >
            <ChevronDown size={16} />
          </div>
        </div>
      </button>

      {open && (
        <div className="px-5 py-5 sm:px-6 font-sans text-sm leading-relaxed text-navy bg-white">
          <NoteMarkdown content={content} highlight={highlight} />
          {askTutorHref && (
            <div className="mt-4 border-t border-[#D7EAFB] pt-3">
              <Link
                href={askTutorHref}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#B9D9F5] bg-[#F4F9FE] px-3 py-1.5 font-heading text-xs font-bold text-[#2A66A3] hover:bg-[#D7EAFB]"
              >
                <MessageCircle size={13} /> Ask tutor about this section
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Wraps case-insensitive matches of `query` in <mark>. */
export function Highlighted({ text, query }: { text: string; query?: string }) {
  const q = query?.trim();
  if (!q) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, 'ig'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={i} className="rounded bg-[#FFE9A8] px-0.5 text-navy">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
