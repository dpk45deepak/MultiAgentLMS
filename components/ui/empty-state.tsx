import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Shared empty state (Feature 9): every dead-end page in the app renders one
 * of these instead of a blank screen — title, one-line explanation, and one
 * actionable CTA that routes to the next logical action.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[#B9D9F5] bg-white/70 px-8 py-12 text-center shadow-xs">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D7EAFB] text-[#2A66A3] border border-[#B9D9F5] shadow-xs">
        <Icon size={22} />
      </div>
      <p className="font-heading text-lg font-bold text-navy">{title}</p>
      <p className="max-w-sm font-sans text-sm font-medium text-navy-muted leading-relaxed">
        {description}
      </p>
      <Button asChild size="sm" className="mt-2">
        <Link href={ctaHref}>{ctaLabel}</Link>
      </Button>
    </div>
  );
}
