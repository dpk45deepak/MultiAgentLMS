import { createClient } from '@/lib/supabase/server';
import { UploadForm } from '@/components/learn/UploadForm';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { DesktopWindow } from '@/components/ui/desktop-window';
import { PastelFolder, Sparkle } from '@/components/ui/kawaii-decorations';
import { BookOpen, FolderOpen } from 'lucide-react';
import { PinButton } from '@/components/ui/pin-button';
import { ErrorState } from '@/components/ui/error-state';

export default async function LearnPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('id, name, topics(id, name, status)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (subjectsError) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <ErrorState />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl xl:max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10 text-navy">
      {/* Page Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-navy sm:text-3xl">
              Learning Workspace
            </h1>
            <Sparkle size={18} color="#FFE9A8" className="animate-sparkle" />
          </div>
          <p className="mt-1 font-sans text-xs font-semibold text-navy-muted sm:text-sm">
            Upload a syllabus photo, paste in text, or add a single topic to generate structured notes.
          </p>
        </div>
        <PinButton
          id="learn-workspace"
          title="Learning Workspace"
          type="notes"
          href="/learn"
          badge="Workspace"
        />
      </div>

      {/* Main Ingestion Desktop Window */}
      <DesktopWindow
        title="Syllabus Ingestion & Topic Generator"
        subtitle="Multi-Agent Analysis"
        icon={<BookOpen size={16} className="text-[#3D82C4]" />}
        className="mb-10"
        bodyClassName="p-6 bg-white"
      >
        <UploadForm />
      </DesktopWindow>

      {/* Subjects & Topics Folders */}
      {subjects && subjects.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <FolderOpen size={18} className="text-[#3D82C4]" />
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-navy">
              Your Subjects & Folders
            </h2>
          </div>

          <div className="flex flex-col gap-4">
            {subjects.map((subject, idx) => {
              const folderVariants: ('blue' | 'yellow' | 'pink' | 'mint')[] = [
                'blue',
                'yellow',
                'pink',
                'mint',
              ];
              const variant = folderVariants[idx % folderVariants.length];

              return (
                <div
                  key={subject.id}
                  className="rounded-2xl border-2 border-[#D7EAFB] bg-white p-5 shadow-card transition-all hover:border-[#B9D9F5]"
                >
                  <div className="mb-4 flex items-center justify-between border-b-2 border-[#D7EAFB] pb-3">
                    <div className="flex items-center gap-3">
                      <PastelFolder variant={variant} badge="book" size={38} />
                      <div>
                        <h3 className="font-heading text-base font-bold text-navy">
                          {subject.name}
                        </h3>
                        <span className="font-sans text-xs font-semibold text-navy-muted">
                          {(subject.topics as unknown[]).length} topic
                          {(subject.topics as unknown[]).length !== 1 ? 's' : ''} in syllabus
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(subject.topics as unknown as { id: string; name: string; status: string }[]).map(
                      (topic) => (
                        <Link key={topic.id} href={`/learn/${topic.id}`} className="group">
                          <span
                            className={`paperclip-pill text-xs transition-transform duration-150 group-hover:scale-105 ${
                              topic.status === 'not_started'
                                ? 'bg-white border-[#D7EAFB]'
                                : 'bg-[#D7EAFB] border-[#B9D9F5]'
                            }`}
                          >
                            <span>{topic.name}</span>
                            {topic.status === 'not_started' && (
                              <span className="text-[10px] font-bold text-navy-muted opacity-80">
                                (New)
                              </span>
                            )}
                          </span>
                        </Link>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
