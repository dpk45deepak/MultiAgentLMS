'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Folder,
  Globe,
  Mail,
  Volume2,
  VolumeX,
  BatteryMedium,
  Wifi,
  Sparkles,
  BookOpen,
  ClipboardList,
  TrendingUp,
  Settings as SettingsIcon,
  X,
  Pin,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  Cpu,
  ArrowRight,
  FolderOpen,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePinnedItems, type PinnedItem, type PinnedItemType } from '@/lib/hooks/use-pinned-items';

export function RetroTaskbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { pinnedItems, unpinItem } = usePinnedItems();

  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);
  const [globeMenuOpen, setGlobeMenuOpen] = useState(false);
  const [mailMenuOpen, setMailMenuOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [timeString, setTimeString] = useState('');
  const [dateString, setDateString] = useState('');

  // Close all popovers
  const closeAllMenus = () => {
    setStartMenuOpen(false);
    setFolderMenuOpen(false);
    setGlobeMenuOpen(false);
    setMailMenuOpen(false);
  };

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setTimeString(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDateString(now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }));
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Icon mapping for pinned items
  const renderItemIcon = (type: PinnedItemType) => {
    switch (type) {
      case 'notes':
        return <BookOpen size={13} className="text-[#3D82C4]" />;
      case 'tutor':
        return <MessageSquare size={13} className="text-[#E57388]" />;
      case 'assessment':
        return <ClipboardList size={13} className="text-[#5A9BD5]" />;
      case 'mentor':
        return <Sparkles size={13} className="text-[#64B587]" />;
      default:
        return <FileText size={13} className="text-[#3D82C4]" />;
    }
  };

  return (
    <>
      {/* Backdrop for open menus */}
      {(startMenuOpen || folderMenuOpen || globeMenuOpen || mailMenuOpen) && (
        <div
          className="fixed inset-0 z-30 bg-black/5 backdrop-blur-[0.5px]"
          onClick={closeAllMenus}
        />
      )}

      {/* Start Menu Popup */}
      {startMenuOpen && (
        <div className="fixed bottom-11 left-2 z-50 w-72 rounded-2xl border-2 border-[#B9D9F5] bg-white p-2.5 shadow-window animate-reveal text-navy">
          <div className="mb-2.5 flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#B9D9F5] to-[#D7EAFB] p-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-navy shadow-xs">
              <Sparkles size={18} className="text-[#3D82C4]" />
            </div>
            <div>
              <p className="font-heading text-sm font-bold text-navy">AI Tutor OS</p>
              <p className="text-[11px] font-medium text-navy-muted">Kawaii Edition v2.0</p>
            </div>
          </div>

          <div className="flex flex-col gap-1 text-xs font-semibold text-navy">
            <Link
              href="/dashboard"
              onClick={closeAllMenus}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-[#D7EAFB] transition-colors"
            >
              <Globe size={15} className="text-[#3D82C4]" />
              <span>Desktop Dashboard</span>
            </Link>
            <Link
              href="/learn"
              onClick={closeAllMenus}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-[#D7EAFB] transition-colors"
            >
              <BookOpen size={15} className="text-[#E5A93C]" />
              <span>Learning Workspace &amp; Notes</span>
            </Link>
            <Link
              href="/tutor"
              onClick={closeAllMenus}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-[#D7EAFB] transition-colors"
            >
              <Mail size={15} className="text-[#E57388]" />
              <span>Ask AI Tutor (HaruMail)</span>
            </Link>
            <Link
              href="/assessment"
              onClick={closeAllMenus}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-[#D7EAFB] transition-colors"
            >
              <ClipboardList size={15} className="text-[#5A9BD5]" />
              <span>Practice Assessments</span>
            </Link>
            <Link
              href="/mentor"
              onClick={closeAllMenus}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-[#D7EAFB] transition-colors"
            >
              <Sparkles size={15} className="text-[#64B587]" />
              <span>AI Study Mentor</span>
            </Link>
            <Link
              href="/progress"
              onClick={closeAllMenus}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-[#D7EAFB] transition-colors"
            >
              <TrendingUp size={15} className="text-[#D97706]" />
              <span>Study Progress &amp; Streaks</span>
            </Link>
            <div className="my-1 border-t border-[#D7EAFB]" />
            <Link
              href="/settings"
              onClick={closeAllMenus}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-[#D7EAFB] transition-colors"
            >
              <SettingsIcon size={15} className="text-navy-muted" />
              <span>Settings &amp; Preferences</span>
            </Link>
          </div>
        </div>
      )}

      {/* Folder Menu Popup (Study Drive) */}
      {folderMenuOpen && (
        <div className="fixed bottom-11 left-16 z-50 w-80 rounded-2xl border-2 border-[#B9D9F5] bg-white p-3 shadow-window animate-reveal text-navy">
          <div className="mb-2 flex items-center justify-between border-b border-[#D7EAFB] pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#D7EAFB] text-[#3D82C4]">
                <Folder size={14} />
              </div>
              <p className="font-heading text-xs font-bold text-navy">Study Drive &amp; Pinned Files</p>
            </div>
            <button
              onClick={closeAllMenus}
              className="text-navy-muted hover:text-navy"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex gap-1.5">
              <Link
                href="/learn"
                onClick={closeAllMenus}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[#B9D9F5] bg-[#F4F9FE] px-2.5 py-2 font-heading text-xs font-bold text-navy hover:bg-[#D7EAFB] transition-colors"
              >
                <FolderOpen size={13} className="text-[#3D82C4]" />
                <span>All Subjects</span>
              </Link>
              <Link
                href="/history"
                onClick={closeAllMenus}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[#B9D9F5] bg-[#F4F9FE] px-2.5 py-2 font-heading text-xs font-bold text-navy hover:bg-[#D7EAFB] transition-colors"
              >
                <FileText size={13} className="text-[#E5A93C]" />
                <span>History Log</span>
              </Link>
            </div>

            {pinnedItems.length > 0 ? (
              <div className="mt-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-navy-muted mb-1.5">
                  Pinned Notes &amp; Items ({pinnedItems.length})
                </p>
                <div className="max-h-44 overflow-y-auto space-y-1">
                  {pinnedItems.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-center justify-between rounded-lg border border-[#E1EEFA] bg-white p-1.5 text-xs hover:border-[#B9D9F5] hover:bg-[#F4F9FE] transition-colors"
                    >
                      <Link
                        href={item.href}
                        onClick={closeAllMenus}
                        className="flex items-center gap-2 min-w-0 flex-1 truncate"
                      >
                        {renderItemIcon(item.type)}
                        <span className="truncate font-semibold text-navy">{item.title}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => unpinItem(item.id)}
                        title="Unpin"
                        className="text-navy-muted opacity-60 hover:opacity-100 hover:text-[#E11D48] px-1"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#B9D9F5] bg-[#FBFDFF] p-3 text-center">
                <Pin size={16} className="mx-auto text-navy-muted mb-1 opacity-60" />
                <p className="font-heading text-xs font-bold text-navy">No pinned files yet</p>
                <p className="text-[11px] text-navy-muted mt-0.5">
                  Open any study note, quiz, or tutor chat and tap &quot;Pin to Taskbar&quot;!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Globe Menu Popup (Study Web Portal) */}
      {globeMenuOpen && (
        <div className="fixed bottom-11 left-24 z-50 w-80 rounded-2xl border-2 border-[#B9D9F5] bg-white p-3 shadow-window animate-reveal text-navy">
          <div className="mb-2 flex items-center justify-between border-b border-[#D7EAFB] pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#D7EAFB] text-[#3D82C4]">
                <Globe size={14} />
              </div>
              <div>
                <p className="font-heading text-xs font-bold text-navy">Kawaii Study Portal</p>
                <p className="text-[10px] text-navy-muted">Connected to AI Engine</p>
              </div>
            </div>
            <button
              onClick={closeAllMenus}
              className="text-navy-muted hover:text-navy"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-2">
            <div className="rounded-xl border border-[#B9D9F5] bg-gradient-to-r from-[#EBF4FD] to-[#F4F9FE] p-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-navy">
                <Cpu size={14} className="text-[#3D82C4]" />
                <span>Multi-Model AI Status</span>
              </div>
              <p className="text-[11px] text-navy-muted mt-1 leading-snug">
                Primary: <strong className="text-navy font-semibold">Groq (openai/gpt-oss-120b)</strong>
                <br />
                Automatic Fallback: <strong className="text-navy font-semibold">Gemini 3.5 Flash</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <Link
                href="/dashboard"
                onClick={closeAllMenus}
                className="flex items-center gap-1.5 rounded-xl border border-[#B9D9F5] bg-white p-2 text-xs font-bold text-navy hover:bg-[#D7EAFB] transition-colors"
              >
                <span>🏠</span>
                <span>Dashboard</span>
              </Link>
              <Link
                href="/progress"
                onClick={closeAllMenus}
                className="flex items-center gap-1.5 rounded-xl border border-[#B9D9F5] bg-white p-2 text-xs font-bold text-navy hover:bg-[#D7EAFB] transition-colors"
              >
                <span>📈</span>
                <span>Progress &amp; Streak</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Mail Menu Popup (HaruMail & AI Tutor Quick Window) */}
      {mailMenuOpen && (
        <div className="fixed bottom-11 left-32 z-50 w-84 rounded-2xl border-2 border-[#B9D9F5] bg-white p-3 shadow-window animate-reveal text-navy">
          <div className="mb-2 flex items-center justify-between border-b border-[#D7EAFB] pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F8C9D4] text-[#E11D48]">
                <Mail size={14} />
              </div>
              <div>
                <p className="font-heading text-xs font-bold text-navy">HaruMail &amp; Tutor Inbox</p>
                <p className="text-[10px] text-navy-muted">1 unread study suggestion</p>
              </div>
            </div>
            <button
              onClick={closeAllMenus}
              className="text-navy-muted hover:text-navy"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-2">
            <div className="rounded-xl border border-[#F2D785] bg-[#FFF9E6] p-2.5">
              <div className="flex items-start justify-between gap-1">
                <p className="font-heading text-xs font-bold text-navy">💌 HaruTutor Study Prompt</p>
                <span className="text-[9px] rounded-full bg-[#FFE9A8] px-1.5 py-0.2 font-bold text-navy">New</span>
              </div>
              <p className="text-[11px] text-navy-muted mt-1 leading-snug">
                &ldquo;Ready to test your understanding or dive into deep conceptual explanations? Ask me anytime!&rdquo;
              </p>
            </div>

            <Link
              href="/tutor"
              onClick={closeAllMenus}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#B9D9F5] bg-[#3D82C4] px-3 py-2 font-heading text-xs font-bold text-white shadow-xs hover:bg-[#2A66A3] transition-colors"
            >
              <span>Open HaruTutor Chat</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* Taskbar Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 flex h-10 select-none items-center justify-between border-t-2 border-[#96C2E9] bg-gradient-to-r from-[#B9D9F5] via-[#CDE3F8] to-[#B9D9F5] px-2 shadow-[0_-2px_6px_rgba(36,54,75,0.06)]">
        {/* Left side: Start Button & Quick Launch */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {/* Start Button */}
          <button
            type="button"
            onClick={() => {
              const next = !startMenuOpen;
              closeAllMenus();
              setStartMenuOpen(next);
            }}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-lg border-2 border-[#8BBCE6] px-2.5 py-0.5 font-heading text-xs font-bold text-navy shadow-xs transition-all duration-100',
              startMenuOpen
                ? 'bg-[#A3CEF4] translate-y-[1px]'
                : 'bg-white hover:bg-[#D7EAFB] active:translate-y-[1px]'
            )}
            aria-label="Start Menu"
            aria-expanded={startMenuOpen}
          >
            <span className="text-sm">🌸</span>
            <span>Start</span>
          </button>

          {/* Quick Launch Icons */}
          <div className="flex items-center gap-1 border-l border-[#8BBCE6] pl-2 shrink-0">
            {/* Folder Icon */}
            <button
              type="button"
              onClick={() => {
                const next = !folderMenuOpen;
                closeAllMenus();
                setFolderMenuOpen(next);
              }}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md text-navy transition-colors shadow-xs',
                folderMenuOpen ? 'bg-white font-bold border border-[#8BBCE6]' : 'hover:bg-white/80'
              )}
              title="Study Files & Pinned Items"
              aria-label="Study Files"
            >
              <Folder size={15} />
            </button>

            {/* Globe Icon */}
            <button
              type="button"
              onClick={() => {
                const next = !globeMenuOpen;
                closeAllMenus();
                setGlobeMenuOpen(next);
              }}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md text-navy transition-colors shadow-xs',
                globeMenuOpen ? 'bg-white font-bold border border-[#8BBCE6]' : 'hover:bg-white/80'
              )}
              title="Kawaii Learning Portal"
              aria-label="Learning Portal"
            >
              <Globe size={15} />
            </button>

            {/* Mail Icon */}
            <button
              type="button"
              onClick={() => {
                const next = !mailMenuOpen;
                closeAllMenus();
                setMailMenuOpen(next);
              }}
              className={cn(
                'relative flex h-7 w-7 items-center justify-center rounded-md text-navy transition-colors shadow-xs',
                mailMenuOpen ? 'bg-white font-bold border border-[#8BBCE6]' : 'hover:bg-white/80'
              )}
              title="HaruMail & AI Tutor"
              aria-label="HaruMail"
            >
              <Mail size={15} />
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#F8C9D4] border border-[#E57388] text-[9px] font-bold text-navy">
                1
              </span>
            </button>
          </div>

          {/* Center-Left: Pinned Application Tabs */}
          <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto max-w-[50vw] py-0.5 px-1 border-l border-[#8BBCE6] ml-1">
            {pinnedItems.map((item) => {
              const isActive = pathname === item.href || (item.href.includes('?') && pathname === item.href.split('?')[0]);
              return (
                <div
                  key={item.id}
                  className={cn(
                    'group flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-heading text-[11px] font-bold transition-all duration-150 shadow-xs cursor-pointer',
                    isActive
                      ? 'border-[#3D82C4] bg-white text-[#2A66A3] shadow-sm'
                      : 'border-[#96C2E9] bg-white/70 text-navy hover:bg-white'
                  )}
                  onClick={() => router.push(item.href)}
                >
                  {renderItemIcon(item.type)}
                  <span className="max-w-[120px] truncate">{item.title}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      unpinItem(item.id);
                    }}
                    title="Unpin"
                    className="ml-0.5 rounded-sm p-0.5 text-navy-muted opacity-60 hover:opacity-100 hover:text-[#E11D48] hover:bg-[#F8C9D4]/40"
                  >
                    <X size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Current Active Window Badge */}
        <div className="hidden items-center gap-2 lg:flex">
          <div className="flex items-center gap-1.5 rounded-md border border-[#8BBCE6] bg-white/70 px-3 py-0.5 font-heading text-[11px] font-bold text-navy shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[#64B587] animate-pulse" />
            <span>
              {pathname.includes('/tutor')
                ? 'HaruTutor Mail'
                : pathname.includes('/learn')
                  ? 'Learning Notes'
                  : pathname.includes('/assessment')
                    ? 'Assessment Center'
                    : pathname.includes('/progress')
                      ? 'Progress Journal'
                      : pathname.includes('/mentor')
                        ? 'AI Mentor'
                        : pathname.includes('/settings')
                          ? 'Control Panel'
                          : 'AI Tutor Desktop'}
            </span>
          </div>
        </div>

        {/* Right side: System Tray */}
        <div className="flex items-center gap-2 rounded-md border border-[#8BBCE6] bg-white/60 px-2 py-0.5 text-xs text-navy shadow-xs shrink-0">
          <button
            type="button"
            onClick={() => setSoundEnabled((s) => !s)}
            title={soundEnabled ? 'Sound On' : 'Muted'}
            aria-label="Toggle Sound"
            className="text-navy-muted hover:text-navy cursor-pointer transition-colors"
          >
            {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} className="text-[#E11D48]" />}
          </button>
          <div title="Connected to AI Tutor Cloud (Groq + Gemini)">
            <Wifi size={13} className="text-[#3D82C4]" />
          </div>
          <BatteryMedium size={13} className="text-navy-muted" />
          <div className="h-3.5 w-px bg-[#8BBCE6]" />
          <div className="flex flex-col text-right leading-none">
            <span className="font-heading text-[11px] font-bold text-navy">
              {timeString || '10:30 AM'}
            </span>
            <span className="hidden text-[9px] font-semibold text-navy-muted md:inline">
              {dateString || 'May 25, 2024'}
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
