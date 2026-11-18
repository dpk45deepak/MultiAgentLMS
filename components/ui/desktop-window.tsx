'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Minus, Square, X } from 'lucide-react';

export interface DesktopWindowProps {
  title: string;
  icon?: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  toolbar?: React.ReactNode;
  statusBar?: React.ReactNode;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

export function DesktopWindow({
  title,
  icon,
  subtitle,
  children,
  className,
  bodyClassName,
  toolbar,
  statusBar,
  onClose,
  onMinimize,
  onMaximize,
}: DesktopWindowProps) {
  return (
    <div
      className={cn(
        'group flex flex-col rounded-2xl border-2 border-[#B9D9F5] bg-white shadow-window transition-all duration-200 overflow-hidden',
        className
      )}
    >
      {/* Title Bar */}
      <div className="flex select-none items-center justify-between border-b-2 border-[#A8CEF0] bg-gradient-to-b from-[#CBE2F9] to-[#B9D9F5] px-3.5 py-2 sm:px-4">
        {/* Left: Window Title & Icon */}
        <div className="flex items-center gap-2 min-w-0">
          {icon ? (
            <div className="shrink-0 text-navy">{icon}</div>
          ) : (
            <span className="text-base" aria-hidden="true">
              💌
            </span>
          )}
          <div className="flex items-baseline gap-2 min-w-0">
            <h2 className="truncate font-heading text-sm font-bold text-navy sm:text-base">
              {title}
            </h2>
            {subtitle && (
              <span className="hidden truncate text-xs font-semibold text-navy-muted md:inline">
                &middot; {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Right: Retro Window Controls */}
        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          <button
            type="button"
            onClick={onMinimize}
            aria-label="Minimize window"
            className="flex h-6 w-6 items-center justify-center rounded-md border border-[#96C2E9] bg-white/90 text-navy transition-all hover:bg-[#D7EAFB] active:translate-y-[1px] shadow-xs"
          >
            <Minus size={12} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={onMaximize}
            aria-label="Maximize window"
            className="flex h-6 w-6 items-center justify-center rounded-md border border-[#96C2E9] bg-white/90 text-navy transition-all hover:bg-[#D7EAFB] active:translate-y-[1px] shadow-xs"
          >
            <Square size={10} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close window"
            className="flex h-6 w-6 items-center justify-center rounded-md border border-[#96C2E9] bg-white/90 text-navy transition-all hover:bg-[#F8C9D4] hover:text-[#E11D48] active:translate-y-[1px] shadow-xs"
          >
            <X size={12} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Retro Toolbar (optional) */}
      {toolbar && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#D7EAFB] bg-[#F7FAFE] px-3.5 py-1.5 text-xs text-navy sm:px-4">
          {toolbar}
        </div>
      )}

      {/* Window Body */}
      <div className={cn('flex-1 bg-white p-4 sm:p-6', bodyClassName)}>
        {children}
      </div>

      {/* Retro Status Bar (optional) */}
      {statusBar && (
        <div className="flex items-center justify-between border-t border-[#D7EAFB] bg-[#F7FAFE] px-3.5 py-1.5 text-xs font-medium text-navy-muted sm:px-4">
          {statusBar}
        </div>
      )}
    </div>
  );
}
