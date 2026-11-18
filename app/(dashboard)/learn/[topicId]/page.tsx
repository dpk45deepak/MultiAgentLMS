import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MessageCircle, ClipboardList } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { NotesReader } from '@/components/notes/NotesReader';
import { GenerateNotesButton } from '@/components/learn/GenerateNotesButton';
import { PinButton } from '@/components/ui/pin-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { StartTestButton } from '@/components/assessment/StartTestButton';
import type { NoteSectionView } from '@/types/domain';

export default async function TopicPage({ params }: { params: { topicId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: topic, error: topicError } = await supabase
    .from('topics')
    .select('id, name, status, subjects(name)')
    .eq('id', params.topicId)
    .eq('user_id', user.id)
    .single();

  // A missing row is "not found"; any other database error is an error state, never "empty".
  if (topicError && topicError.code !== 'PGRST116') {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <ErrorState />
      </div>
    );
  }
  if (!topic) notFound();

  const { data: note, error: noteError } = await supabase
    .from('notes')
    .select('id, generation_status, note_sections(section_key, title, content_markdown, order_index)')
    .eq('topic_id', topic.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (noteError) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <ErrorState message="We couldn’t load the notes for this topic. Please refresh in a moment." />
      </div>
    );
  }
  const generating = note?.generation_status === 'generating';

  const sections: NoteSectionView[] = note
    ? (note.note_sections as unknown as { section_key: string; title: string; content_markdown: string; order_index: number }[])
        .sort((a, b) => a.order_index - b.order_index)
        .map((s) => ({ key: s.section_key, title: s.title, contentMarkdown: s.content_markdown }))
    : [];

  const subjectName = (topic.subjects as unknown as { name: string } | null)?.name ?? 'General';

  return (
    <div className="mx-auto w-full max-w-7xl xl:max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10 text-navy">
      {/* Breadcrumb Navigation */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/learn"
          className="inline-flex items-center gap-2 rounded-xl border-2 border-[#D7EAFB] bg-white px-3 py-1.5 font-heading text-xs font-bold text-navy shadow-xs transition-colors hover:bg-[#D7EAFB]"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
          <span>&larr; Back to Learning Workspace</span>
        </Link>
        <PinButton
          id={`note-${topic.id}`}
          title={`${topic.name} Notes`}
          type="notes"
          href={`/learn/${topic.id}`}
          badge={subjectName}
        />
      </div>

      {/* Hero Header Card */}
      <div className="mb-8 rounded-2xl border-2 border-[#B9D9F5] bg-white p-6 shadow-window sm:p-8 washi-tape washi-tape-blue">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="marker">{subjectName}</Badge>
              {sections.length > 0 && (
                <Badge variant="highlight">
                  {sections.length} module{sections.length !== 1 ? 's' : ''}
                </Badge>
              )}
              <span className="rounded-full bg-[#EBF4FD] px-3 py-1 font-heading text-xs font-bold text-navy border border-[#B9D9F5]">
                AI Notes
              </span>
            </div>
            <h1 className="font-heading text-2xl font-bold text-navy sm:text-3xl">
              {topic.name}
            </h1>
            <p className="mt-2 font-sans text-xs font-semibold leading-relaxed text-navy-muted sm:text-sm">
              Structured study guide synthesized from multi-agent analysis. Includes core concepts, architectures, workflows, and edge-cases.
            </p>
          </div>

          {sections.length > 0 && (
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <PinButton
                id={`note-${topic.id}`}
                title={`${topic.name} Notes`}
                type="notes"
                href={`/learn/${topic.id}`}
                badge={subjectName}
              />
              <Button variant="marker" asChild className="shadow-sm">
                <Link href={`/tutor?topicId=${topic.id}`} className="flex items-center gap-2">
                  <MessageCircle size={15} />
                  <span>Ask HaruTutor</span>
                </Link>
              </Button>
              <StartTestButton topicId={topic.id} compact label="Practice Quiz" icon={<ClipboardList size={15} />} />
            </div>
          )}
        </div>
      </div>

      {sections.length > 0 ? (
        <>
          <div className="mb-4 flex justify-end">
            <GenerateNotesButton topicId={topic.id} regenerate compact />
          </div>
          <NotesReader sections={sections} topicId={topic.id} />
        </>
      ) : generating ? (
        <div className="rounded-2xl border-2 border-dashed border-[#B9D9F5] bg-white p-10 text-center shadow-card text-sm font-semibold text-navy-muted">
          Your notes are being generated right now. Refresh this page in a few seconds.
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-[#B9D9F5] bg-white p-10 text-center shadow-card">
          <GenerateNotesButton topicId={topic.id} />
        </div>
      )}
    </div>
  );
}
