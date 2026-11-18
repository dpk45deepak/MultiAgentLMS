'use client';

import React from 'react';
import {
  Mail,
  Send,
  Star,
  FileText,
  Archive,
  ArrowLeft,
  ArrowRight,
  Trash2,
  FolderOpen,
  MoreHorizontal,
  CheckCircle2,
  Paperclip,
} from 'lucide-react';
import {
  BunnyMascot,
  EnvelopeMascot,
  SmilingCloud,
  Sparkle,
} from '@/components/ui/kawaii-decorations';

export function NotebookPreview() {
  return (
    <div className="relative mx-auto w-full max-w-2xl select-none rounded-2xl border-2 border-[#B9D9F5] bg-white shadow-window overflow-hidden">
      {/* Title Bar */}
      <div className="flex items-center justify-between border-b-2 border-[#A8CEF0] bg-gradient-to-r from-[#CDE3F8] via-[#B9D9F5] to-[#CDE3F8] px-4 py-2">
        <div className="flex items-center gap-2">
          <Mail size={16} className="text-navy" />
          <span className="font-heading text-xs font-bold text-navy sm:text-sm">
            HaruMail &middot; AI Tutor Companion
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-sm border border-[#96C2E9] bg-white/90 text-navy shadow-xs">
            <span className="text-xs leading-none">-</span>
          </div>
          <div className="flex h-5 w-5 items-center justify-center rounded-sm border border-[#96C2E9] bg-white/90 text-navy shadow-xs">
            <span className="text-[10px] leading-none">▢</span>
          </div>
          <div className="flex h-5 w-5 items-center justify-center rounded-sm border border-[#96C2E9] bg-white/90 text-navy shadow-xs hover:bg-[#F8C9D4]">
            <span className="text-xs leading-none">✕</span>
          </div>
        </div>
      </div>

      {/* Main Window Split Layout */}
      <div className="flex flex-col sm:flex-row">
        {/* Left Inner Sidebar (as shown in reference image) */}
        <div className="hidden w-44 shrink-0 flex-col border-r-2 border-[#D7EAFB] bg-[#F5F9FD] p-3 sm:flex">
          {/* Compose Button */}
          <button
            type="button"
            className="mb-3 flex items-center justify-center gap-2 rounded-xl border-2 border-[#B9D9F5] bg-white py-2 font-heading text-xs font-bold text-navy shadow-[0_2px_0_0_#B9D9F5] hover:bg-[#D7EAFB]"
          >
            <Send size={13} className="text-[#3D82C4]" />
            <span>Compose</span>
          </button>

          {/* Folder items */}
          <div className="flex flex-col gap-1 text-xs font-bold text-navy-muted">
            <div className="flex items-center justify-between rounded-lg bg-[#D7EAFB] px-2.5 py-1.5 text-navy border border-[#B9D9F5]/70">
              <div className="flex items-center gap-2">
                <Mail size={13} className="text-[#3D82C4]" />
                <span>Inbox</span>
              </div>
              <span className="rounded-full bg-[#F8C9D4] px-1.5 py-0.2 text-[10px] font-bold text-navy">
                1
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-[#EAF3FC] text-navy-muted">
              <Star size={13} />
              <span>Starred</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-[#EAF3FC] text-navy-muted">
              <FileText size={13} />
              <span>Notes</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-[#EAF3FC] text-navy-muted">
              <Archive size={13} />
              <span>Archives</span>
            </div>
          </div>

          {/* Cute Bunny Mascot with laptop at bottom of sidebar! */}
          <div className="mt-auto pt-4 text-center">
            <div className="relative inline-block">
              <BunnyMascot />
              <div className="absolute -top-1 -right-1 rotate-3 rounded bg-[#FFE9A8] border border-[#F2D785] px-1.5 py-0.5 text-[8px] font-bold text-navy shadow-xs">
                progress, not perfection ♡
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 bg-[#FFFDF9] p-4 sm:p-5">
          {/* Retro Toolbar */}
          <div className="mb-4 flex items-center justify-between border-b border-[#D7EAFB] pb-2 text-xs font-semibold text-navy-muted">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#D7EAFB] bg-white text-navy hover:bg-[#D7EAFB]"
              >
                <ArrowLeft size={13} />
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-lg border border-[#D7EAFB] bg-white px-2 py-1 text-[11px] text-navy hover:bg-[#D7EAFB]"
                >
                  <Trash2 size={11} />
                  <span>Delete</span>
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-lg border border-[#D7EAFB] bg-white px-2 py-1 text-[11px] text-navy hover:bg-[#D7EAFB]"
                >
                  <Archive size={11} />
                  <span>Archive</span>
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-lg border border-[#D7EAFB] bg-white px-2 py-1 text-[11px] text-navy hover:bg-[#D7EAFB]"
                >
                  <FolderOpen size={11} />
                  <span>Move</span>
                </button>
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#D7EAFB] bg-white text-navy hover:bg-[#D7EAFB]"
                >
                  <MoreHorizontal size={13} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#D7EAFB] bg-white text-navy hover:bg-[#D7EAFB]"
              >
                <ArrowLeft size={13} />
              </button>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#D7EAFB] bg-white text-navy hover:bg-[#D7EAFB]"
              >
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* New Message Header Banner with Cute Envelope Mascot */}
          <div className="relative mb-4 flex items-center justify-between rounded-xl bg-gradient-to-r from-[#D7EAFB]/50 via-white to-[#F8C9D4]/30 p-3 border border-[#D7EAFB]">
            <div className="flex items-center gap-2.5">
              <EnvelopeMascot size={46} />
              <div>
                <div className="flex items-center gap-1">
                  <Sparkle size={14} color="#FFE9A8" className="animate-sparkle" />
                  <h3 className="font-heading text-sm font-bold tracking-wider text-navy sm:text-base">
                    NEW MESSAGE RECEIVED
                  </h3>
                  <Sparkle size={14} color="#F8C9D4" className="animate-sparkle" />
                </div>
                <p className="font-sans text-[11px] font-semibold text-navy-muted">
                  From: Future You &middot; Subject: Thank You.
                </p>
              </div>
            </div>

            {/* Pinned Sticky Note: "proud of you ♡" with washi tape */}
            <div className="relative hidden rotate-3 rounded-lg bg-[#FFE9A8] border border-[#F2D785] p-2 text-center shadow-sticky sm:block">
              <div className="absolute -top-1.5 left-1/2 h-3 w-10 -translate-x-1/2 rounded-xs border-x border-dashed border-white/80 bg-[#F8C9D4]/70" />
              <p className="font-heading text-[10px] font-bold text-navy leading-tight">
                proud of you ♡
              </p>
            </div>
          </div>

          {/* Letter Content */}
          <div className="mb-4 rounded-xl border border-[#D7EAFB] bg-white p-3.5 shadow-xs font-sans text-xs leading-relaxed text-navy sm:text-sm">
            <p className="font-heading text-xs font-bold text-[#3D82C4] mb-1">
              Message from your study companion:
            </p>
            <p className="italic text-navy">
              &ldquo;Thank you... For starting. For showing up. For trying again. For believing before seeing results.&rdquo;
            </p>
          </div>

          {/* Attachments Pills (like reference image: 📎 Confidence, 📎 Discipline, 📎 Better Habits, 📎 Growth) */}
          <div className="mb-4">
            <p className="mb-1.5 font-heading text-[11px] font-bold text-navy-muted">
              Attachments:
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="paperclip-pill">
                <Paperclip size={13} className="text-[#3D82C4]" />
                <span>Confidence</span>
              </span>
              <span className="paperclip-pill">
                <Paperclip size={13} className="text-[#3D82C4]" />
                <span>Discipline</span>
              </span>
              <span className="paperclip-pill">
                <Paperclip size={13} className="text-[#3D82C4]" />
                <span>Better Habits</span>
              </span>
              <span className="paperclip-pill">
                <Paperclip size={13} className="text-[#3D82C4]" />
                <span>Growth</span>
              </span>
            </div>
          </div>

          {/* Status Alert Bar with smiling cloud mascot */}
          <div className="flex items-center justify-between rounded-xl border-2 border-[#D6EAD6] bg-[#EDF7ED] px-3.5 py-2 text-xs font-bold text-navy shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#388E3C]" />
              <span>Message Successfully Delivered.</span>
            </div>
            <SmilingCloud size={32} />
          </div>

          {/* Bottom Banner Badge */}
          <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border-2 border-[#B9D9F5] bg-gradient-to-r from-[#D7EAFB] via-white to-[#D7EAFB] py-2 px-4 text-center shadow-xs">
            <span className="text-base" aria-hidden="true">
              💖
            </span>
            <span className="font-heading text-xs font-bold uppercase tracking-wider text-navy sm:text-sm">
              Your future is replying to today&rsquo;s choices.
            </span>
            <span className="text-base" aria-hidden="true">
              ⭐
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
