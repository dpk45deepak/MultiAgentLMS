import { redirect } from 'next/navigation';
import { BookOpenCheck, ClipboardCheck, Percent, Target, Flame, ListChecks, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { computePerformanceBreakdown } from '@/lib/agents/performance-agent';
import { fetchStreak } from '@/lib/data/streak';
import { fetchLearnerPrefs } from '@/lib/memory/preferences';
import { formatShortDate } from '@/lib/dates';
import { ErrorState } from '@/components/ui/error-state';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { OverviewCards, type StatCardData } from '@/components/progress/OverviewCards';
import { ScoreTrendChart } from '@/components/progress/ScoreTrendChart';
import { TopicPerformanceList, type TopicPerformance } from '@/components/progress/TopicPerformanceList';
import { ActivityCalendar } from '@/components/progress/ActivityCalendar';

export default async function ProgressPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const prefs = await fetchLearnerPrefs(supabase, user.id);

  // Every query below is scoped to the authenticated user (RLS enforces this
  // too). Aggregates that could exceed PostgREST's 1000-row cap are computed
  // in SQL (get_active_days / get_answer_stats) instead of fetched row by row.
  const [
    { count: sessionCount, error: sessionError },
    streakResult,
    { data: attemptsDesc, error: attemptsError },
    { data: answerStats, error: statsError },
    performance,
  ] = await Promise.all([
    supabase.from('learning_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    fetchStreak(supabase, prefs.timezone),
    supabase
      .from('assessment_attempts')
      .select('score, submitted_at, assessments!inner(topic_id, topics(name))')
      .eq('user_id', user.id)
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false })
      .limit(300),
    supabase.rpc('get_answer_stats'),
    computePerformanceBreakdown(supabase, user.id),
  ]);

  if (sessionError || attemptsError || statsError) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <ErrorState />
      </div>
    );
  }

  const attempts = (attemptsDesc ?? []).slice().reverse();

  const hasAnyActivity = (sessionCount ?? 0) > 0;

  if (!hasAnyActivity) {
    return (
      <div className="mx-auto w-full max-w-7xl xl:max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#B9D9F5]/50 px-3 py-1 text-xs font-semibold text-navy border border-[#8EBBE3]">
            <TrendingUp size={13} className="text-[#3D82C4]" />
            STUDY REPORT &bull; PROGRESS.EXE
          </span>
        </div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-navy">Learning Progress</h1>
        <p className="mt-1 mb-8 text-sm text-navy-muted">Track how your learning journey is blooming over time.</p>
        <EmptyState
          icon={TrendingUp}
          title="No progress recorded yet"
          description="Start your first learning session to plant the seeds for your progress report."
          ctaLabel="Start Learning"
          ctaHref="/learn"
        />
      </div>
    );
  }


  type Attempt = { score: number; submitted_at: string; assessments: { topic_id: string; topics: { name: string } | null } | null };
  const typedAttempts = (attempts ?? []) as unknown as Attempt[];
  const streak = streakResult.streak;

  const totalAssessments = typedAttempts.length;
  const averageScore =
    totalAssessments > 0 ? Math.round(typedAttempts.reduce((sum, a) => sum + a.score, 0) / totalAssessments) : null;
  // Short answers count as correct when they earned full marks (see get_answer_stats).
  const questionsAttempted = Number(answerStats?.[0]?.attempted ?? 0);
  const questionsCorrect = Number(answerStats?.[0]?.correct ?? 0);

  const stats: StatCardData[] = [
    { label: 'Learning sessions', value: String(sessionCount ?? 0), icon: BookOpenCheck },
    { label: 'Assessments done', value: String(totalAssessments), icon: ClipboardCheck },
    { label: 'Average score', value: averageScore != null ? `${averageScore}%` : '—', icon: Percent },
    { label: 'Questions attempted', value: String(questionsAttempted), icon: ListChecks },
    { label: 'Answered correctly', value: String(questionsCorrect), icon: Target },
    { label: 'Current streak', value: `${streak.currentStreak}d`, icon: Flame, hint: `Best: ${streak.longestStreak}d` },
  ];

  const scoreTrendPoints = typedAttempts.map((a) => ({
    label: formatShortDate(a.submitted_at, prefs.timezone),
    score: a.score,
  }));

  const byTopic = new Map<string, { name: string; scores: number[] }>();
  for (const a of typedAttempts) {
    if (!a.assessments) continue;
    const entry = byTopic.get(a.assessments.topic_id) ?? { name: a.assessments.topics?.name ?? 'Untitled topic', scores: [] };
    entry.scores.push(a.score);
    byTopic.set(a.assessments.topic_id, entry);
  }
  const topicPerformance: TopicPerformance[] = Array.from(byTopic.entries())
    .map(([topicId, { name, scores }]) => ({
      topicId,
      topicName: name,
      averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      attempts: scores.length,
    }))
    .sort((a, b) => a.averageScore - b.averageScore);

  return (
    <div className="mx-auto w-full max-w-7xl xl:max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#B9D9F5]/40 px-3 py-1 text-xs font-semibold text-navy border border-[#8EBBE3]">
              <TrendingUp size={13} className="text-[#3D82C4]" />
              ANALYTICS &bull; PROGRESS REPORT
            </span>
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-navy">Learning Progress</h1>
          <p className="mt-1 text-sm text-navy-muted">Real-time breakdown calculated directly from your study sessions.</p>
        </div>

        <div className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-pastel-yellow/60 border border-[#FFE9A8] px-3.5 py-2 text-xs font-semibold text-navy shadow-xs">
          <span>🌟</span>
          <span>Every step forward counts!</span>
        </div>
      </div>

      <OverviewCards stats={stats} />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="relative overflow-hidden">
          <div className="washi-tape washi-tape-blue -top-2.5 right-8" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-base text-[#3D82C4]">📈</span>
              Score Trend
            </CardTitle>
            <CardDescription>Your assessment accuracy scores over time.</CardDescription>
          </CardHeader>
          <CardContent>
            {scoreTrendPoints.length > 0 ? (
              <ScoreTrendChart points={scoreTrendPoints} />
            ) : (
              <p className="text-sm text-navy-muted">Take an assessment to generate your score trend line.</p>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="washi-tape washi-tape-yellow -top-2.5 right-8" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-base text-[#F2B04B]">📅</span>
              Activity Calendar
            </CardTitle>
            <CardDescription>Last 12 weeks &middot; {streak.totalActiveDays} active study days logged.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityCalendar activeDayKeys={streak.activeDayKeys} todayKey={streakResult.todayKey} />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-base text-[#64B587]">🎯</span>
              Topic-wise Performance
            </CardTitle>
            <CardDescription>Average score per topic, weakest first.</CardDescription>
          </CardHeader>
          <CardContent>
            {topicPerformance.length > 0 ? (
              <TopicPerformanceList topics={topicPerformance} />
            ) : (
              <p className="text-sm text-navy-muted">No assessments completed yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-base text-[#E57388]">💡</span>
              Concept Strength
            </CardTitle>
            <CardDescription>From every concept you&rsquo;ve been tested on.</CardDescription>
          </CardHeader>
          <CardContent>
            {!performance.hasData ? (
              <p className="text-sm text-navy-muted">No concept data yet — complete an assessment to see breakdown.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {performance.weak.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-muted flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#E57388]" />
                      Needs work
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {performance.weak.map((c) => (
                        <Badge key={c} variant="flag">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {performance.moderate.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-muted flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#F2B04B]" />
                      Getting there
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {performance.moderate.map((c) => (
                        <Badge key={c} variant="highlight">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {performance.strong.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-muted flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#64B587]" />
                      Strong
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {performance.strong.map((c) => (
                        <Badge key={c} variant="marker">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

