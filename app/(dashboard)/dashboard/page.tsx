import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ArrowRight, Sparkles, Flame, Folder, Calendar } from 'lucide-react';
import { fetchStreak } from '@/lib/data/streak';
import { fetchLearnerPrefs } from '@/lib/memory/preferences';
import { ErrorState } from '@/components/ui/error-state';
import { DesktopWindow } from '@/components/ui/desktop-window';
import { StickyNoteWidget, SmilingCloud, Sparkle } from '@/components/ui/kawaii-decorations';

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const prefs = await fetchLearnerPrefs(supabase, user.id);

  const [
    { data: profile },
    { data: topics, error: topicsError },
    { data: readyTopics, error: readyError },
    { data: pendingTopics, error: pendingError },
    { count: totalTopics, error: countError },
    { count: notStartedCount, error: notStartedError },
    streakResult,
  ] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
    // Recent topics panel
    supabase
      .from('topics')
      .select('id, name, status, created_at, subjects(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(8),
    // Ready-to-study panel
    supabase
      .from('topics')
      .select('id, name, status, created_at, subjects(name)')
      .eq('user_id', user.id)
      .neq('status', 'not_started')
      .order('created_at', { ascending: false })
      .limit(8),
    // Candidates for "Recommended next" — sorted below in syllabus order.
    supabase
      .from('topics')
      .select('id, name, order_index, subjects(name, created_at), units(order_index)')
      .eq('user_id', user.id)
      .eq('status', 'not_started')
      .limit(300),
    supabase.from('topics').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('topics').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'not_started'),
    fetchStreak(supabase, prefs.timezone),
  ]);

  if (topicsError || readyError || pendingError || countError || notStartedError) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <ErrorState />
      </div>
    );
  }

  type Pending = {
    id: string;
    name: string;
    order_index: number;
    subjects: { name: string; created_at: string } | null;
    units: { order_index: number } | null;
  };
  // Syllabus order: subject (oldest first), then unit order, then topic order.
  const nextTopic = ((pendingTopics ?? []) as unknown as Pending[]).sort(
    (a, b) =>
      (a.subjects?.created_at ?? '').localeCompare(b.subjects?.created_at ?? '') ||
      (a.units?.order_index ?? 0) - (b.units?.order_index ?? 0) ||
      a.order_index - b.order_index
  )[0];

  const hasAnyTopics = (totalTopics ?? 0) > 0;
  const allCaughtUp = hasAnyTopics && (notStartedCount ?? 0) === 0;
  const notesReady = readyTopics ?? [];
  const streak = streakResult.streak;
  const greetingName = profile?.display_name?.trim() || user.email?.split('@')[0] || '';

  return (
    <div className="mx-auto w-full max-w-7xl xl:max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10 text-navy">
      {/* Top Greeting & Streak Ribbon */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-[#B9D9F5] bg-white/80 p-5 shadow-card backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#D7EAFB] border-2 border-[#B9D9F5] shadow-xs">
            <span className="text-2xl" aria-hidden="true">
              🌸
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl font-bold text-navy sm:text-3xl">
                Welcome back{greetingName ? `, ${greetingName}` : ''}!
              </h1>
              <Sparkle size={18} color="#FFE9A8" className="animate-sparkle" />
            </div>
            <p className="font-sans text-xs font-semibold text-navy-muted sm:text-sm">
              Here&rsquo;s your personal study dashboard and learning progress.
            </p>
          </div>
        </div>

        {streak.currentStreak > 0 && (
          <Link href="/progress">
            <div className="flex items-center gap-2 rounded-2xl border-2 border-[#F2D785] bg-[#FFE9A8] px-4 py-2 font-heading text-xs font-bold text-navy shadow-xs transition-transform hover:scale-105">
              <Flame size={16} className="text-[#D97706]" />
              <span>
                {streak.currentStreak} day{streak.currentStreak !== 1 ? 's' : ''} study streak!
              </span>
            </div>
          </Link>
        )}
      </div>

      {/* Main Focus Window: Recommended Study Mission */}
      <DesktopWindow
        title="Today's Study Mission & Recommendations"
        subtitle="AI Companion Assistant"
        icon={<Sparkles size={16} className="text-[#3D82C4]" />}
        className="mb-8"
        bodyClassName="p-6 bg-gradient-to-br from-[#FFFDF9] via-white to-[#D7EAFB]/30"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#D7EAFB] border-2 border-[#B9D9F5] text-navy shadow-xs">
              <BookOpen size={22} className="text-[#3D82C4]" />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold text-navy sm:text-lg">
                {!hasAnyTopics
                  ? 'Upload your first syllabus to get started'
                  : nextTopic
                    ? `Recommended next: generate notes for "${nextTopic.name}"`
                    : allCaughtUp
                      ? 'You\u2019re all caught up! Review notes or start a quiz.'
                      : 'Pick up where you left off in the Learn workspace.'}
              </h2>
              <p className="mt-1 font-sans text-xs font-medium leading-relaxed text-navy-muted sm:text-sm">
                {!hasAnyTopics
                  ? 'A photo of your syllabus or a pasted topic list is enough — AI Tutor will structure it for you.'
                  : nextTopic
                    ? 'This is the next topic in your syllabus order that doesn\u2019t have notes yet.'
                    : 'Add another subject anytime from the Learn tab or ask your AI Tutor questions.'}
              </p>
            </div>
          </div>

          <Button variant="marker" asChild className="shrink-0 shadow-sm">
            <Link href={nextTopic ? `/learn/${nextTopic.id}` : '/learn'} className="flex items-center gap-2">
              <span>{!hasAnyTopics ? 'Upload Syllabus' : nextTopic ? 'Generate these notes' : 'Go to Learn Workspace'}</span>
              <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
      </DesktopWindow>

      {/* Two Column Section + Motivational Sticky Note */}
      <div className="grid gap-6 lg:grid-cols-[1fr,1fr,240px]">
        {/* Recent Topics Panel */}
        <div className="rounded-2xl border-2 border-[#D7EAFB] bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between border-b-2 border-[#D7EAFB] pb-3">
            <div className="flex items-center gap-2">
              <Folder size={16} className="text-[#3D82C4]" />
              <h3 className="font-heading text-sm font-bold text-navy">Recent Topics</h3>
            </div>
            <Link
              href="/learn"
              className="font-heading text-xs font-bold text-[#2A66A3] hover:underline"
            >
              View all &rarr;
            </Link>
          </div>

          {!hasAnyTopics ? (
            <EmptyStateCard text="No topics yet — upload a syllabus to build your topic map." />
          ) : (
            <div className="flex flex-col gap-2.5">
              {(topics ?? []).map((topic) => (
                <Link key={topic.id} href={`/learn/${topic.id}`} className="group block">
                  <div className="flex items-center justify-between rounded-xl border-2 border-[#D7EAFB] bg-[#FFFDF9] p-3 shadow-xs transition-all duration-150 group-hover:-translate-y-0.5 group-hover:border-[#B9D9F5] group-hover:bg-[#F4F9FE]">
                    <div className="min-w-0 pr-2">
                      <p className="truncate font-heading text-xs font-bold text-navy group-hover:text-[#2A66A3]">
                        {topic.name}
                      </p>
                      <p className="font-sans text-[11px] font-semibold text-navy-muted">
                        {(topic.subjects as unknown as { name: string } | null)?.name ?? 'General'}
                      </p>
                    </div>
                    <StatusBadge status={topic.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Ready to Study Panel */}
        <div className="rounded-2xl border-2 border-[#D7EAFB] bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between border-b-2 border-[#D7EAFB] pb-3">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-[#E5A93C]" />
              <h3 className="font-heading text-sm font-bold text-navy">Ready to Study</h3>
            </div>
            <span className="font-heading text-xs font-bold text-navy-muted">
              {notesReady.length}{(totalTopics ?? 0) - (notStartedCount ?? 0) > notesReady.length ? '+' : ''} ready
            </span>
          </div>

          {notesReady.length === 0 ? (
            <EmptyStateCard text="Generated notes will show up here once ready." />
          ) : (
            <div className="flex flex-col gap-2.5">
              {notesReady.map((topic) => (
                <Link key={topic.id} href={`/learn/${topic.id}`} className="group block">
                  <div className="flex items-center gap-3 rounded-xl border-2 border-[#D7EAFB] bg-[#FFFDF9] p-3 shadow-xs transition-all duration-150 group-hover:-translate-y-0.5 group-hover:border-[#B9D9F5] group-hover:bg-[#F4F9FE]">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#D7EAFB] text-[#2A66A3] border border-[#B9D9F5]">
                      <BookOpen size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-heading text-xs font-bold text-navy group-hover:text-[#2A66A3]">
                        {topic.name}
                      </p>
                      <span className="font-sans text-[11px] font-bold text-[#3D82C4]">
                        Revise notes &rarr;
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Motivational Sticky Note Column */}
        <div className="flex flex-col gap-4">
          <StickyNoteWidget
            title="Study Tip"
            message={`Small daily habits compound into massive exam success.\n\nYou're doing wonderful! ♡`}
            signature="@haruverse"
            variant="yellow"
          />

          <div className="rounded-2xl border-2 border-[#D7EAFB] bg-white p-4 shadow-card text-center">
            <SmilingCloud size={44} className="mx-auto mb-2" />
            <p className="font-heading text-xs font-bold text-navy">Need help right now?</p>
            <p className="font-sans text-[11px] font-medium text-navy-muted mt-1 leading-snug">
              Chat with HaruTutor for fast explanations and revision checks.
            </p>
            <Button size="sm" variant="outline" asChild className="mt-3 w-full">
              <Link href="/tutor">Open HaruTutor</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Hint */}
      <p className="mt-8 text-center font-sans text-xs font-semibold text-navy-muted">
        Head to{' '}
        <Link href="/assessment" className="font-bold text-[#2A66A3] hover:underline">
          Assessment
        </Link>{' '}
        to test a topic, or{' '}
        <Link href="/mentor" className="font-bold text-[#2A66A3] hover:underline">
          Mentor
        </Link>{' '}
        for guidance based on your results so far.
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') return <Badge variant="mint">Completed</Badge>;
  if (status === 'notes_ready') return <Badge variant="marker">Notes ready</Badge>;
  return <Badge variant="default">Not started</Badge>;
}

function EmptyStateCard({ text }: { text: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-[#D7EAFB] bg-[#FFFDF9] px-4 py-8 text-center font-sans text-xs font-semibold text-navy-muted">
      {text}
    </div>
  );
}
