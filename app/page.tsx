import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { NotebookPreview } from '@/components/landing/NotebookPreview';
import {
  PastelFolder,
  StickyNoteWidget,
  Sparkle,
  SmilingCloud,
} from '@/components/ui/kawaii-decorations';
import { RetroTaskbar } from '@/components/ui/retro-taskbar';
import { ArrowRight, Sparkles, BookOpen, MessageCircle, ClipboardCheck, RotateCcw } from 'lucide-react';

const LOOP_STEPS = [
  {
    title: 'Learn',
    desc: 'Upload a syllabus photo or type a topic to generate structured notes.',
    icon: BookOpen,
    tape: 'washi-tape-blue',
    color: 'bg-[#D7EAFB]',
  },
  {
    title: 'Understand',
    desc: 'Structured, exam-oriented study guides — not an unreadable wall of text.',
    icon: Sparkles,
    tape: 'washi-tape-yellow',
    color: 'bg-[#FFE9A8]',
  },
  {
    title: 'Ask',
    desc: 'Stuck on something in your notes? HaruTutor answers in friendly modes.',
    icon: MessageCircle,
    tape: 'washi-tape',
    color: 'bg-[#F8C9D4]',
  },
  {
    title: 'Assess',
    desc: 'Adaptive mini-quizzes with AI grading and instant feedback.',
    icon: ClipboardCheck,
    tape: 'washi-tape-mint',
    color: 'bg-[#D6EAD6]',
  },
  {
    title: 'Revise',
    desc: 'AI Mentor points out exactly which concepts need another pass.',
    icon: RotateCcw,
    tape: 'washi-tape-yellow',
    color: 'bg-[#E6DDF8]',
  },
];

export default function LandingPage() {
  return (
      <div className="relative min-h-screen desktop-wallpaper pb-14 text-navy">
          {/* Decorative dreamy clouds and sparkles in background */}
          <div
              className="pointer-events-none absolute inset-0 overflow-hidden"
              aria-hidden="true"
          >
              <div className="absolute -top-10 left-10 opacity-60 animate-float">
                  <SmilingCloud size={100} />
              </div>
              <div
                  className="absolute top-24 right-16 opacity-70 animate-float"
                  style={{ animationDelay: "2s" }}
              >
                  <SmilingCloud size={120} />
              </div>
              <div className="absolute top-48 left-1/4 opacity-80 animate-sparkle">
                  <Sparkle size={26} color="#FFE9A8" />
              </div>
              <div
                  className="absolute top-96 right-1/3 opacity-80 animate-sparkle"
                  style={{ animationDelay: "1.2s" }}
              >
                  <Sparkle size={22} color="#F8C9D4" />
              </div>
              <div
                  className="absolute bottom-32 left-16 opacity-70 animate-sparkle"
                  style={{ animationDelay: "0.8s" }}
              >
                  <Sparkle size={28} color="#B9D9F5" />
              </div>
          </div>

          {/* Retro Desktop Navigation Bar */}
          <header className="top-0 z-30 border-b-2 border-[#B9D9F5] backdrop-blur-md">
              {/* Subtle OS Top Window Highlight Bar */}
              <div
                  aria-hidden="true"
                  className="h-1 w-full bg-gradient-to-r from-[#D7EAFB] via-[#FFE9A8] to-[#D7EAFB]"
              />

              <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 sm:px-8 sm:py-3">
                  {/* Brand / OS App Launcher */}
                  <Link
                      href="/"
                      className="group flex items-center gap-3 rounded-2xl pr-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B9D9F5]"
                  >
                      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#B9D9F5] bg-[#D7EAFB] shadow-[2px_2px_0px_#B9D9F5] transition-all duration-200 group-hover:-rotate-6 group-hover:scale-105 group-active:translate-x-[1px] group-active:translate-y-[1px] group-active:shadow-none">
                          <span
                              className="text-lg leading-none select-none"
                              aria-hidden="true"
                          >
                              💌
                          </span>
                          {/* Tiny OS Active Status Indicator */}
                          <span
                              aria-hidden="true"
                              className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#388E3C]"
                          />
                      </div>

                      <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                              <span className="font-heading text-base font-bold tracking-tight text-navy sm:text-lg">
                                  MultiAgentLMS
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full border border-[#F2D785] bg-[#FFE9A8] px-2 py-0.5 text-[10px] font-bold tracking-wide text-navy shadow-[1px_1px_0px_#F2D785]">
                                  <span aria-hidden="true">✦</span>
                                  Kawaii OS
                              </span>
                          </div>
                          <p className="hidden font-sans text-[11px] font-semibold text-navy-muted sm:block">
                              Your Personal Learning Companion
                          </p>
                      </div>
                  </Link>

                  {/* Right OS System Tray & Actions */}
                  <nav
                      aria-label="Primary navigation"
                      className="flex items-center gap-2.5 sm:gap-3"
                  >
                      {/* Subtle Desktop Status Chip */}
                      <div
                          aria-hidden="true"
                          className="hidden items-center gap-1.5 rounded-full border border-[#D7EAFB] bg-[#D7EAFB]/30 px-2.5 py-1 text-[11px] font-semibold text-navy-muted md:flex"
                      >
                          <span className="h-1.5 w-1.5 rounded-full bg-[#388E3C]" />
                          <span>v2.0 Ready</span>
                      </div>

                      <Button
                          variant="outline"
                          size="sm"
                          className="border-[#B9D9F5] font-semibold text-navy transition-all hover:border-navy/30 hover:bg-[#D7EAFB]/40"
                          asChild
                      >
                          <Link href="/login">Log in</Link>
                      </Button>

                      <Button
                          variant="marker"
                          size="sm"
                          className="font-bold shadow-[2px_2px_0px_#B9D9F5] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
                          asChild
                      >
                          <Link
                              href="/register"
                              className="inline-flex items-center gap-1"
                          >
                              <span>Get started</span>
                              <span
                                  aria-hidden="true"
                                  className="transition-transform group-hover:translate-x-0.5"
                              >
                                  &rarr;
                              </span>
                          </Link>
                      </Button>
                  </nav>
              </div>
          </header>

          {/* Main Desktop Workspace Area */}
          <main className="relative mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12">
              <div className="grid gap-8 lg:grid-cols-[1fr,auto] lg:items-start">
                  {/* Main Column */}
                  <div>
                      {/* Cute Hero Intro Banner */}
                      <div className="mb-6 animate-reveal">
                          <div className="inline-flex items-center gap-2 rounded-full border-2 border-[#B9D9F5] bg-[#D7EAFB]/70 px-3.5 py-1 text-xs font-bold text-navy shadow-xs">
                              <span>🌸</span>
                              <span>
                                  A personalized learning companion for students
                              </span>
                          </div>
                          <h1 className="mt-4 font-heading text-3xl font-bold leading-tight sm:text-5xl sm:leading-[1.15]">
                              Turn a syllabus photo into notes worth revising.
                          </h1>
                          <p className="mt-4 max-w-2xl font-sans text-base font-semibold leading-relaxed text-navy-muted sm:text-lg">
                              AI Tutor reads your syllabus, builds a topic map,
                              and writes structured notes for each one —
                              definitions, workings, exam points, and common
                              mistakes. Then it remembers what you studied, so
                              revision starts where you left off.
                          </p>

                          {/* Action Buttons */}
                          <div className="mt-6 flex flex-wrap items-center gap-3 sm:gap-4">
                              <Button
                                  size="lg"
                                  variant="marker"
                                  asChild
                                  className="shadow-md"
                              >
                                  <Link
                                      href="/register"
                                      className="flex items-center gap-2"
                                  >
                                      <span>Start learning now</span>
                                      <ArrowRight size={18} />
                                  </Link>
                              </Button>
                              <Button size="lg" variant="outline" asChild>
                                  <Link href="/login">
                                      I already have an account
                                  </Link>
                              </Button>
                          </div>
                      </div>

                      {/* Central HaruMail Window Showcase */}
                      <div
                          className="mt-8 animate-reveal"
                          style={{ animationDelay: "120ms" }}
                      >
                          <NotebookPreview />
                      </div>
                  </div>

                  {/* Right Column: Desktop Icons & Sticky Note (as in reference image!) */}
                  <aside className="flex flex-col items-center gap-6 py-4 lg:w-48 lg:items-end">
                      {/* Desktop Shortcut Folders */}
                      <div className="flex flex-wrap justify-center gap-4 lg:flex-col lg:items-end lg:gap-3">
                          <Link
                              href="/learn"
                              className="desktop-shortcut-folder text-center group"
                          >
                              <PastelFolder
                                  variant="blue"
                                  badge="cloud"
                                  size={48}
                                  className="transition-transform group-hover:scale-105"
                              />
                              <span className="font-heading text-xs font-bold text-navy">
                                  Dreams
                              </span>
                          </Link>
                          <Link
                              href="/progress"
                              className="desktop-shortcut-folder text-center group"
                          >
                              <PastelFolder
                                  variant="yellow"
                                  badge="heart"
                                  size={48}
                                  className="transition-transform group-hover:scale-105"
                              />
                              <span className="font-heading text-xs font-bold text-navy">
                                  Goals
                              </span>
                          </Link>
                          <Link
                              href="/learn"
                              className="desktop-shortcut-folder text-center group"
                          >
                              <PastelFolder
                                  variant="pink"
                                  badge="star"
                                  size={48}
                                  className="transition-transform group-hover:scale-105"
                              />
                              <span className="font-heading text-xs font-bold text-navy">
                                  Plans
                              </span>
                          </Link>
                          <Link
                              href="/mentor"
                              className="desktop-shortcut-folder text-center group"
                          >
                              <PastelFolder
                                  variant="mint"
                                  badge="sprout"
                                  size={48}
                                  className="transition-transform group-hover:scale-105"
                              />
                              <span className="font-heading text-xs font-bold text-navy">
                                  Growth
                              </span>
                          </Link>
                      </div>

                      {/* Desktop Sticky Note Pinned to Desktop */}
                      <div className="w-48 lg:mt-4">
                          <StickyNoteWidget
                              title="Daily Study Note"
                              message="Keep going. Your future is watching."
                              signature="@haruverse ♡"
                              variant="yellow"
                          />
                      </div>
                  </aside>
              </div>

              {/* The 5-Step Loop Section (Styled as Kawaii Stationery Cards) */}
              <section className="mt-16 sm:mt-24">
                  <div className="rounded-3xl border-2 border-[#B9D9F5] bg-white p-6 shadow-window sm:p-10">
                      <div className="mb-8 flex items-center justify-between">
                          <div>
                              <span className="rounded-full bg-[#FFE9A8] px-2.5 py-0.5 text-xs font-bold text-navy border border-[#F2D785]">
                                  The Learning Workflow
                              </span>
                              <h2 className="mt-2 font-heading text-2xl font-bold sm:text-3xl">
                                  The loop, not just a chatbot.
                              </h2>
                          </div>
                          <div className="hidden sm:block">
                              <SmilingCloud size={48} />
                          </div>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
                          {LOOP_STEPS.map((step, i) => {
                              const Icon = step.icon;
                              return (
                                  <div
                                      key={step.title}
                                      className={`relative flex flex-col justify-between rounded-2xl border-2 border-[#D7EAFB] bg-[#FFFDF9] p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-[#B9D9F5] ${step.tape}`}
                                  >
                                      <div>
                                          <div className="mb-3 flex items-center justify-between">
                                              <div
                                                  className={`flex h-9 w-9 items-center justify-center rounded-xl border border-[#B9D9F5] ${step.color} shadow-xs text-navy`}
                                              >
                                                  <Icon size={17} />
                                              </div>
                                              <span className="font-heading text-xs font-bold text-navy-muted">
                                                  0{i + 1}
                                              </span>
                                          </div>
                                          <h3 className="font-heading text-base font-bold text-navy">
                                              {step.title}
                                          </h3>
                                          <p className="mt-1.5 font-sans text-xs font-semibold leading-relaxed text-navy-muted">
                                              {step.desc}
                                          </p>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              </section>

              {/* Footer Note */}
              <footer className="mt-16 text-center font-sans text-xs font-semibold text-navy-muted pb-8">
                  AI Tutor OS &middot; A kawaii retro pastel workspace for
                  smarter, joyful studying.
              </footer>
          </main>

          {/* Retro Desktop Taskbar */}
          <RetroTaskbar />
      </div>
  );
}
