import { redirect } from 'next/navigation';
import { History as HistoryIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/ui/empty-state';
import { HistoryList, type HistoryItem } from '@/components/history/HistoryList';
import { ErrorState } from '@/components/ui/error-state';
import { fetchLearnerPrefs } from '@/lib/memory/preferences';

// A safe upper bound per source table (requirement: "pagination or a safe
// limit"). The merged, sorted list is then paginated client-side in
// HistoryList without further round trips, since a student's total history
// realistically stays well under this across all three sources combined.
const PER_SOURCE_LIMIT = 100;

export default async function HistoryPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const prefs = await fetchLearnerPrefs(supabase, user.id);

  const [
    { data: notes, error: notesError },
    { data: attempts, error: attemptsError },
    { data: sessions, error: sessionsError },
  ] = await Promise.all([
    supabase
      .from('notes')
      .select('id, topic_id, created_at, topics(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(PER_SOURCE_LIMIT),
    supabase
      .from('assessment_attempts')
      .select('id, assessment_id, score, submitted_at, assessments!inner(topic_id, topics(name))')
      .eq('user_id', user.id)
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false })
      .limit(PER_SOURCE_LIMIT),
    supabase
      .from('chat_sessions')
      .select('id, topic_id, mode, created_at, topics(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(PER_SOURCE_LIMIT),
  ]);

  if (notesError || attemptsError || sessionsError) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <ErrorState />
      </div>
    );
  }

  type NoteRow = { id: string; topic_id: string; created_at: string; topics: { name: string } | null };
  type AttemptRow = {
    id: string;
    assessment_id: string;
    score: number;
    submitted_at: string;
    assessments: { topic_id: string; topics: { name: string } | null } | null;
  };
  type SessionRow = { id: string; topic_id: string | null; mode: string; created_at: string; topics: { name: string } | null };

  const items: HistoryItem[] = [
    ...((notes ?? []) as unknown as NoteRow[]).map(
      (n): HistoryItem => ({
        kind: 'notes',
        id: n.id,
        topicId: n.topic_id,
        title: n.topics?.name ?? 'Untitled topic',
        date: n.created_at,
        href: `/learn/${n.topic_id}`,
      })
    ),
    ...((attempts ?? []) as unknown as AttemptRow[])
      .filter((a) => a.assessments)
      .map(
        (a): HistoryItem => ({
          kind: 'assessment',
          id: a.id,
          topicId: a.assessments!.topic_id,
          title: a.assessments!.topics?.name ?? 'Untitled topic',
          date: a.submitted_at,
          score: a.score,
          href: `/assessment/${a.assessment_id}/result?attempt=${a.id}`,
        })
      ),
    ...((sessions ?? []) as unknown as SessionRow[])
      .filter((s) => s.topic_id)
      .map(
        (s): HistoryItem => ({
          kind: 'tutor',
          id: s.id,
          topicId: s.topic_id!,
          title: s.topics?.name ?? 'Untitled topic',
          date: s.created_at,
          mode: s.mode,
          href: `/tutor?topicId=${s.topic_id}`,
        })
      ),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-7xl xl:max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#B9D9F5]/40 px-3 py-1 text-xs font-semibold text-navy border border-[#8EBBE3]">
            <HistoryIcon size={13} className="text-[#3D82C4]" />
            ARCHIVE &bull; LOGS.DAT
          </span>
        </div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-navy">Learning History</h1>
        <p className="mt-1 mb-8 text-sm text-navy-muted">Every session, quiz, and study note recorded in your diary.</p>
        <EmptyState
          icon={HistoryIcon}
          title="Your learning history is empty"
          description="Generate notes or take an assessment to begin tracking your journey."
          ctaLabel="Explore Tutor"
          ctaHref="/tutor"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl xl:max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#B9D9F5]/40 px-3 py-1 text-xs font-semibold text-navy border border-[#8EBBE3]">
          <HistoryIcon size={13} className="text-[#3D82C4]" />
          ARCHIVE &bull; LOGS.DAT
        </span>
      </div>
      <h1 className="font-heading text-3xl font-bold tracking-tight text-navy">Learning History</h1>
      <p className="mt-1 mb-6 text-sm text-navy-muted">Everything you&rsquo;ve done across AI Tutor, chronologically organized.</p>
      <HistoryList items={items} timeZone={prefs.timezone} />
    </div>
  );
}

