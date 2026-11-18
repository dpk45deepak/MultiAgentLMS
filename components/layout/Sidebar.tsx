'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Menu,
  LogOut,
  MessageCircle,
  ClipboardList,
  X,
  Sparkles,
  TrendingUp,
  History,
  Settings,
  FolderHeart,
} from 'lucide-react';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { BunnyMascot } from '@/components/ui/kawaii-decorations';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: 'Home' },
  { href: '/learn', label: 'Learn', icon: BookOpen, badge: 'Notes' },
  { href: '/tutor', label: 'Tutor', icon: MessageCircle, badge: 'Chat' },
  { href: '/assessment', label: 'Assessment', icon: ClipboardList, badge: 'Quiz' },
  { href: '/mentor', label: 'Mentor', icon: Sparkles, badge: 'AI' },
  { href: '/progress', label: 'Progress', icon: TrendingUp, badge: 'Streak' },
  { href: '/history', label: 'History', icon: History },
];

const FOOTER_NAV_ITEMS = [{ href: '/settings', label: 'Settings', icon: Settings }];

export function Sidebar({ displayName }: { displayName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMobileOpen(false);
    router.push('/');
    router.refresh();
  }

  const renderNavItems = (onNavigate?: () => void) => (
    <>
      {NAV_ITEMS.map(({ href, label, icon: Icon, badge }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              'group flex min-h-10 items-center justify-between rounded-xl px-3 py-2 font-heading text-sm font-bold transition-all duration-150',
              active
                ? 'bg-[#D7EAFB] text-navy border-2 border-[#B9D9F5] shadow-xs translate-x-0.5'
                : 'text-navy-muted hover:bg-[#F3F8FD] hover:text-navy'
            )}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-lg border transition-transform duration-150 group-hover:scale-105',
                  active
                    ? 'bg-[#B9D9F5] border-[#8EBBE3] text-navy'
                    : 'bg-white border-[#D7EAFB] text-navy-muted group-hover:text-navy'
                )}
              >
                <Icon size={15} aria-hidden="true" />
              </div>
              <span>{label}</span>
            </div>
            {badge && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-bold',
                  active
                    ? 'bg-[#B9D9F5] text-navy'
                    : 'bg-[#F4F9FE] text-navy-muted group-hover:bg-[#D7EAFB]'
                )}
              >
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );

  const renderFooterItems = (onNavigate?: () => void) => (
    <>
      {FOOTER_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              'group flex min-h-9 items-center gap-2.5 rounded-xl px-3 py-1.5 font-heading text-xs font-bold transition-all duration-150',
              active
                ? 'bg-[#D7EAFB] text-navy border border-[#B9D9F5]'
                : 'text-navy-muted hover:bg-[#F3F8FD] hover:text-navy'
            )}
          >
            <Icon size={14} className="text-navy-muted group-hover:text-navy" aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
      <button
        onClick={handleSignOut}
        className="group flex min-h-9 w-full items-center gap-2.5 rounded-xl px-3 py-1.5 text-left font-heading text-xs font-bold text-navy-muted transition-all duration-150 hover:bg-[#FDEAEF] hover:text-[#E11D48]"
      >
        <LogOut size={14} className="text-navy-muted group-hover:text-[#E11D48]" aria-hidden="true" />
        <span>Log out</span>
      </button>
    </>
  );

  const initials = displayName
    ? displayName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'ST';

  return (
    <>
      {/* Desktop Retro Sidebar */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r-2 border-[#B9D9F5] bg-white lg:sticky lg:top-0 lg:flex shadow-xs select-none">
        {/* Titlebar-inspired header */}
        <div className="border-b-2 border-[#B9D9F5] bg-gradient-to-r from-[#D7EAFB] via-[#C5E1F9] to-[#B9D9F5] p-3.5">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-[#96C2E9] text-navy shadow-xs transition-transform group-hover:scale-105">
              <FolderHeart size={18} className="text-[#3D82C4]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-heading text-base font-bold text-navy">AI Tutor</span>
                <span className="rounded-full bg-[#FFE9A8] border border-[#F2D785] px-1.5 py-0.2 text-[10px] font-bold text-navy">
                  Haru
                </span>
              </div>
              <p className="font-sans text-[11px] font-semibold text-navy-muted">
                Learning OS
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation list */}
        <nav className="flex flex-1 flex-col gap-1 p-3 overflow-y-auto">
          {renderNavItems()}

          {/* Cute Mascot Sticker Section matching the reference image bottom-left! */}
          <div className="mt-auto pt-4 pb-2 px-1 text-center">
            <div className="relative inline-block rounded-2xl border-2 border-dashed border-[#D7EAFB] bg-[#FFF9EE] p-2.5 shadow-xs">
              <BunnyMascot />
              <div className="mt-1 rounded-lg bg-[#FFE9A8] border border-[#F2D785] px-2 py-1 text-center shadow-xs">
                <p className="font-heading text-[10px] font-bold text-navy leading-tight">
                  progress, not perfection ♡
                </p>
              </div>
            </div>
          </div>
        </nav>

        {/* Profile Card & Footer */}
        <div className="border-t-2 border-[#D7EAFB] bg-[#F7FAFE] p-3">
          <div className="mb-2 flex items-center gap-2.5 rounded-xl border-2 border-[#D7EAFB] bg-white px-3 py-2 shadow-xs">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F8C9D4] border border-[#ECA7B7] text-navy text-xs font-bold shadow-xs">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-xs font-bold text-navy">{displayName}</p>
              <p className="font-sans text-[10px] font-medium text-navy-muted">Student Workspace</p>
            </div>
          </div>
          {renderFooterItems()}
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b-2 border-[#B9D9F5] bg-white/95 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#D7EAFB] border border-[#B9D9F5] text-navy shadow-xs">
            <FolderHeart size={16} className="text-[#3D82C4]" />
          </div>
          <span className="font-heading text-base font-bold text-navy">AI Tutor</span>
        </Link>
        <button
          type="button"
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#D7EAFB] bg-white text-navy hover:bg-[#D7EAFB] shadow-xs"
        >
          {mobileOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-label="Navigation menu">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-navy/30 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="relative flex min-h-full w-[min(19rem,85vw)] flex-col border-r-2 border-[#B9D9F5] bg-white p-3 shadow-window">
            <div className="flex items-center justify-between border-b-2 border-[#D7EAFB] pb-3 pt-1">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#D7EAFB] border border-[#B9D9F5] text-navy shadow-xs">
                  <FolderHeart size={16} className="text-[#3D82C4]" />
                </div>
                <div className="min-w-0">
                  <p className="font-heading text-sm font-bold text-navy">AI Tutor</p>
                  <p className="truncate text-xs font-semibold text-navy-muted">{displayName}</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#D7EAFB] bg-white text-navy hover:bg-[#D7EAFB]"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-1 pt-3">{renderNavItems(() => setMobileOpen(false))}</div>
            <div className="border-t-2 border-[#D7EAFB] pt-3">{renderFooterItems(() => setMobileOpen(false))}</div>
          </nav>
        </div>
      )}
    </>
  );
}
