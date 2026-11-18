'use client';

import { formatDate } from '@/lib/dates';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FileText, ClipboardCheck, MessageCircle, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type HistoryItem =
  | { kind: 'notes'; id: string; topicId: string; title: string; date: string; href: string }
  | { kind: 'assessment'; id: string; topicId: string; title: string; date: string; score: number; href: string }
  | { kind: 'tutor'; id: string; topicId: string; title: string; date: string; mode: string; href: string };

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'assessment', label: 'Assessments' },
  { value: 'notes', label: 'Notes' },
  { value: 'tutor', label: 'Learning sessions' },
] as const;

type Filter = (typeof FILTERS)[number]['value'];

const PAGE_SIZE = 20;

const KIND_META: Record<HistoryItem['kind'], { icon: typeof FileText; label: string }> = {
  notes: { icon: FileText, label: 'Notes generated' },
  assessment: { icon: ClipboardCheck, label: 'Assessment completed' },
  tutor: { icon: MessageCircle, label: 'Tutor session' },
};

function scoreVariant(score: number): 'marker' | 'highlight' | 'flag' {
  if (score >= 75) return 'marker';
  if (score >= 50) return 'highlight';
  return 'flag';
}

export function HistoryList({ items, timeZone }: { items: HistoryItem[]; timeZone?: string }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((i) => i.kind === filter)),
    [items, filter]
  );
  const visible = filtered.slice(0, visibleCount);

  function handleFilterChange(next: Filter) {
    setFilter(next);
    setVisibleCount(PAGE_SIZE);
  }

  const kindIcons = {
    notes: { bg: 'bg-[#B9D9F5]/40 text-[#3D82C4] border-[#B9D9F5]', icon: FileText },
    assessment: { bg: 'bg-[#FFE9A8]/50 text-[#F2B04B] border-[#FFE9A8]', icon: ClipboardCheck },
    tutor: { bg: 'bg-[#F8C9D4]/40 text-[#E57388] border-[#F8C9D4]', icon: MessageCircle },
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter history">
        {FILTERS.map((f) => {
          const isActive = filter === f.value;
          return (
            <button
              key={f.value}
              role="tab"
              aria-selected={isActive}
              onClick={() => handleFilterChange(f.value)}
              className={cn(
                'rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all duration-150',
                isActive
                  ? 'border-[#8EBBE3] bg-[#B9D9F5] text-navy shadow-[0_2px_0_0_#8EBBE3]'
                  : 'border-[#D7EAFB] bg-white text-navy-muted hover:bg-[#D7EAFB]/30 hover:text-navy'
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#D7EAFB] bg-white/70 p-8 text-center">
          <p className="text-sm font-medium text-navy-muted">No activity records in this category yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {visible.map((item) => {
            const { label } = KIND_META[item.kind];
            const meta = kindIcons[item.kind];
            const Icon = meta.icon;
            return (
              <Link
                key={`${item.kind}-${item.id}`}
                href={item.href}
                className="group flex items-center gap-3.5 rounded-2xl border-2 border-[#D7EAFB] bg-white px-4 py-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#8EBBE3] hover:shadow-md"
              >
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm', meta.bg)}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-navy group-hover:text-[#3D82C4] transition-colors">
                    {item.title}
                  </p>
                  <p className="text-xs text-navy-muted">
                    {label} &middot;{' '}
                    {formatDate(item.date, timeZone)}
                  </p>
                </div>
                {item.kind === 'assessment' && (
                  <Badge variant={scoreVariant(item.score)} className="shrink-0 font-bold">
                    {item.score}%
                  </Badge>
                )}
                {item.kind === 'tutor' && (
                  <Badge variant="mint" className="shrink-0 font-bold capitalize">
                    {item.mode.replace('_', ' ')}
                  </Badge>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {visibleCount < filtered.length && (
        <Button
          variant="outline"
          size="sm"
          className="mx-auto rounded-xl border-2 border-[#D7EAFB] bg-white text-navy font-bold hover:bg-[#D7EAFB]/30"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
        >
          <ChevronDown size={14} className="mr-1" /> Show more ({filtered.length - visibleCount} left)
        </Button>
      )}
    </div>
  );
}

