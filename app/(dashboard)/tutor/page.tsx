import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ChatWindow } from '@/components/tutor/ChatWindow';
import { MessageCircle } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { PinButton } from '@/components/ui/pin-button';
import { ErrorState } from '@/components/ui/error-state';
import { fetchLearnerPrefs } from '@/lib/memory/preferences';

export default async function TutorPage({ searchParams }: { searchParams: { topicId?: string; section?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const topicId = searchParams.topicId;

  if (!topicId) {
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('id, name, subjects(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (topicsError) {
      return (
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
          <ErrorState />
        </div>
      );
    }

    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10 text-navy">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl font-bold text-navy sm:text-3xl">
                Ask HaruTutor
              </h1>
              <span className="text-xl" aria-hidden="true">
                💌
              </span>
            </div>
            <p className="mt-1 font-sans text-xs font-semibold text-navy-muted sm:text-sm">
              Pick a topic from your subjects to open an interactive tutor conversation.
            </p>
          </div>
          <PinButton
            id="tutor-hub"
            title="HaruTutor Chat Hub"
            type="tutor"
            href="/tutor"
            badge="Tutor"
          />
        </div>

        {!topics || topics.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No topics to ask about yet"
            description="Add a topic from your syllabus first, then come back to chat with your tutor about it."
            ctaLabel="Go to Learn Workspace"
            ctaHref="/learn"
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {topics.map((t) => (
              <div
                key={t.id}
                className="group flex items-center justify-between rounded-2xl border-2 border-[#D7EAFB] bg-white px-5 py-3.5 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:border-[#B9D9F5] hover:bg-[#F4F9FE]"
              >
                <Link
                  href={`/tutor?topicId=${t.id}`}
                  className="flex items-center gap-3 min-w-0 flex-1"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#D7EAFB] text-[#3D82C4] border border-[#B9D9F5]">
                    <MessageCircle size={16} />
                  </div>
                  <div className="min-w-0">
                    <span className="font-heading text-sm font-bold text-navy group-hover:text-[#2A66A3] truncate block">
                      {t.name}
                    </span>
                    <p className="font-sans text-[11px] font-semibold text-navy-muted">
                      {(t.subjects as unknown as { name: string } | null)?.name ?? 'General'}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-2.5 shrink-0 pl-2">
                  <PinButton
                    id={`tutor-topic-${t.id}`}
                    title={`Tutor: ${t.name}`}
                    type="tutor"
                    href={`/tutor?topicId=${t.id}`}
                    badge="Tutor"
                    compact
                  />
                  <Link
                    href={`/tutor?topicId=${t.id}`}
                    className="font-heading text-xs font-bold text-[#3D82C4] hover:underline"
                  >
                    Start Chat &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const { data: topic, error: topicError } = await supabase
    .from('topics')
    .select('id, name, subjects(name), subtopics(name, order_index)')
    .eq('id', topicId)
    .eq('user_id', user.id)
    .single();

  if (topicError && topicError.code !== 'PGRST116') {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <ErrorState />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 xl:px-10 text-navy">
        <div className="rounded-2xl border-2 border-[#D7EAFB] bg-white p-6 shadow-card text-center">
          <p className="mb-4 font-heading text-sm font-bold text-navy">That topic couldn&rsquo;t be found.</p>
          <Button asChild size="sm">
            <Link href="/tutor">Choose a topic</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tutor_display_name')
    .eq('id', user.id)
    .single();

  const prefs = await fetchLearnerPrefs(supabase, user.id);
  const subtopics = ((topic.subtopics as unknown as { name: string; order_index: number }[] | null) ?? [])
    .sort((x, y) => x.order_index - y.order_index)
    .map((x) => x.name);
  const section = searchParams.section?.slice(0, 120);

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] w-full max-w-7xl xl:max-w-[1600px] flex-col px-3 py-3 sm:px-6 sm:py-4 lg:px-8 xl:px-10">
      <ChatWindow
        topicId={topic.id}
        topicName={topic.name}
        subjectName={(topic.subjects as unknown as { name: string } | null)?.name ?? 'General'}
        tutorDisplayName={profile?.tutor_display_name || 'AI Tutor'}
        initialMode={prefs.explanationStyle}
        language={prefs.language}
        subtopics={subtopics}
        prefill={section ? `Can you explain the "${section}" section of my notes in more detail, with an example?` : undefined}
      />
    </div>
  );
}
