'use client';

import React from 'react';
import { Pin, PinOff, Check } from 'lucide-react';
import { usePinnedItems, type PinnedItemType } from '@/lib/hooks/use-pinned-items';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PinButtonProps {
  id: string;
  title: string;
  type: PinnedItemType;
  href: string;
  badge?: string;
  compact?: boolean;
  className?: string;
}

export function PinButton({
  id,
  title,
  type,
  href,
  badge,
  compact = false,
  className,
}: PinButtonProps) {
  const { isPinned, togglePin } = usePinnedItems();
  const pinned = isPinned(href);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    togglePin({ id, title, type, href, badge });
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={pinned ? 'Unpin from Taskbar' : 'Pin to Taskbar'}
        aria-label={pinned ? 'Unpin from Taskbar' : 'Pin to Taskbar'}
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-md border transition-all duration-150 active:translate-y-[1px] shadow-xs',
          pinned
            ? 'border-[#3D82C4] bg-[#D7EAFB] text-[#2A66A3] font-bold'
            : 'border-[#96C2E9] bg-white/90 text-navy hover:bg-[#D7EAFB]',
          className
        )}
      >
        <Pin size={11} className={cn(pinned ? 'fill-[#3D82C4] rotate-45' : '')} />
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl border-2 font-heading text-xs font-bold transition-all duration-150 shadow-xs',
        pinned
          ? 'border-[#64B587] bg-[#E8F8EE] text-[#1B6D3D] hover:bg-[#D4F3DE]'
          : 'border-[#B9D9F5] bg-white text-navy hover:border-[#8EBBE3] hover:bg-[#F4F9FE]',
        className
      )}
    >
      {pinned ? (
        <>
          <Check size={13} className="text-[#1B6D3D]" />
          <span>Pinned to Taskbar</span>
        </>
      ) : (
        <>
          <Pin size={13} className="text-[#3D82C4]" />
          <span>Pin to Taskbar</span>
        </>
      )}
    </Button>
  );
}
