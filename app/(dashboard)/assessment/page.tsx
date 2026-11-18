import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StartTestButton } from '@/components/assessment/StartTestButton';
import { EmptyState } from '@/components/ui/empty-state';
import { ClipboardList } from 'lucide-react';
import { PinButton } from '@/components/ui/pin-button';
import { ErrorState } from '@/components/ui/error-state';
import { fetchLearnerPrefs } from '@/lib/memory/preferences';
import { formatDateTime } from '@/lib/dates';
import Link from 'next/link';

export default async function AssessmentDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const prefs = await fetchLearnerPrefs(supabase, user.id);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: topics, error: topicsError }, { data: attempts, error: attemptsError }, { data: recentAssessments, error: recentError }] =
    await Promise.all([
      supabase
        .from('topics')
        .select('id, name, status, subjects(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('assessment_attempts')
        .select('score, submitted_at, assessments(topic_id)')
        .eq('user_id', user.id)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(1000),
      supabase
        .from('assessments')
        .select('id, difficulty, created_at, topics(name), assessment_attempts(id)')
        .eq('user_id', user.id)
        .gte('created_at', weekAgo)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

  if (topicsError || attemptsError || recentError) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <ErrorState />
      </div>
    );
  }

  // Quizzes that were generated but never submitted can be resumed.
  const unfinished = (recentAssessments ?? []).filter(
    (a) => (((a as unknown as { assessment_attempts: unknown[] | null }).assessment_attempts ?? []).length === 0)
  );

  const attemptsByTopic = new Map<string, number[]>();
  for (const a of (attempts ?? []) as unknown as { score: number; assessments: { topic_id: string } | null }[]) {
    if (!a.assessments) continue;
    const list = attemptsByTopic.get(a.assessments.topic_id) ?? [];
    list.push(a.score);
    attemptsByTopic.set(a.assessments.topic_id, list);
  }

  return (
    <div className="mx-auto w-full max-w-7xl xl:max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10 text-navy">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-navy sm:text-3xl">
              Assessments & Quizzes
            </h1>
            <span className="text-xl" aria-hidden="true">
              ⭐
            </span>
          </div>
          <p className="mt-1 font-sans text-xs font-semibold text-navy-muted sm:text-sm">
            Test what you&rsquo;ve studied. The difficulty automatically adapts to your past score on each topic.
          </p>
        </div>
        <PinButton
          id="assessment-hub"
          title="Assessments Hub"
          type="assessment"
          href="/assessment"
          badge="Quizzes"
        />
      </div>

      {unfinished.length > 0 && (
        <section aria-labelledby="resume-heading" className="mb-6 rounded-2xl border-2 border-[#FFE9A8] bg-[#FFF8E1] p-4 shadow-xs">
          <h2 id="resume-heading" className="mb-2 font-heading text-sm font-bold text-navy">
            Pick up where you left off
          </h2>
          <ul className="flex flex-col gap-2">
            {unfinished.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 font-sans text-xs font-semibold text-navy-muted">
                <span>
                  {(a.topics as unknown as { name: string } | null)?.name ?? 'Quiz'} &middot;{' '}
                  <span className="capitalize">{a.difficulty}</span> &middot; started {formatDateTime(a.created_at, prefs.timezone)}
                </span>
                <Link href={`/assessment/${a.id}`} className="font-heading font-bold text-[#2A66A3] hover:underline">
                  Resume &rarr;
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!topics || topics.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No assessments yet"
          description="Create your first assessment from your syllabus topics."
          ctaLabel="Go to Learn Workspace"
          ctaHref="/learn"
        />
      ) : (
        <div className="flex flex-col gap-3.5">
          {topics.map((topic) => {
            const scores = attemptsByTopic.get(topic.id) ?? [];
            const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

            return (
              <div
                key={topic.id}
                className="rounded-2xl border-2 border-[#D7EAFB] bg-white p-5 shadow-card transition-all hover:border-[#B9D9F5]"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-heading text-base font-bold text-navy">{topic.name}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 font-sans text-xs font-semibold text-navy-muted">
                      <span>{(topic.subjects as unknown as { name: string } | null)?.name ?? 'General'}</span>
                      {scores.length > 0 ? (
                        <Badge variant={avg && avg >= 75 ? 'mint' : avg && avg >= 50 ? 'highlight' : 'flag'}>
                          Avg {avg}% &middot; {scores.length} attempt{scores.length > 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <Badge variant="default">No attempts yet</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <PinButton
                      id={`quiz-${topic.id}`}
                      title={`Quiz: ${topic.name}`}
                      type="assessment"
                      href={`/assessment`}
                      badge="Quiz"
                      compact
                    />
                    <StartTestButton topicId={topic.id} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
