import { NextResponse } from 'next/server';
import { enforceQuota } from '@/lib/usage/quota';
import { aiErrorStatus } from '@/lib/ai/errors';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { mentorGraph, type MentorGraphConfigurable } from '@/lib/langgraph/mentor-graph';
import { computePerformanceBreakdown, type PerformanceBreakdown } from '@/lib/agents/performance-agent';
import { fetchAllLearnerContext } from '@/lib/memory/long-term';
import { fetchRecentTutorQuestions } from '@/lib/memory/tutor-context';
import { fetchLearnerPrefs } from '@/lib/memory/preferences';
import { AllProvidersFailedError } from '@/lib/ai/fallback-model';
import { MentorPostBodySchema, parseJsonBody } from '@/lib/validation/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import { hashMentorInput } from '@/lib/mentor/hash';
import type { MentorRecommendation } from '@/lib/validation/schemas';
import type { Json } from '@/types/database';

export const maxDuration = 120;

function youtubeSearchUrl(topic: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${topic} explained`)}`;
}

function present(
  recommendation: MentorRecommendation,
  performance: PerformanceBreakdown,
  extra: Record<string, unknown> = {}
) {
  return {
    summary: recommendation.summary,
    performance,
    recommendations: recommendation.recommendations.map((r) => ({ ...r, youtubeSearchUrl: youtubeSearchUrl(r.topic) })),
    ...extra,
  };
}

async function loadContext() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, prefs, performance, { data: snapshot }] = await Promise.all([
    supabase.from('profiles').select('mentor_display_name').eq('id', user.id).single(),
    fetchLearnerPrefs(supabase, user.id),
    computePerformanceBreakdown(supabase, user.id),
    supabase.from('mentor_snapshots').select('input_hash, payload, created_at').eq('user_id', user.id).maybeSingle(),
  ]);

  const mentorName = profile?.mentor_display_name || 'AI Mentor';
  return {
    supabase,
    user,
    mentorName,
    prefs,
    performance,
    snapshot,
    hash: hashMentorInput(performance, prefs.language, mentorName),
  };
}

/**
 * GET never calls the LLM and never writes: it returns the cached
 * recommendation (flagging it `stale` when new results exist) or tells the UI
 * there is nothing to show yet. Regeneration is an explicit POST.
 */
export async function GET() {
  const ctx = await loadContext();
  if (!ctx) return NextResponse.json({ error: 'You need to be logged in to do this.' }, { status: 401 });

  if (ctx.snapshot) {
    const cached = ctx.snapshot.payload as unknown as MentorRecommendation;
    return NextResponse.json(
      present(cached, ctx.performance, {
        stale: ctx.snapshot.input_hash !== ctx.hash,
        generatedAt: ctx.snapshot.created_at,
      })
    );
  }

  return NextResponse.json({
    summary: ctx.performance.hasData
      ? 'Your results are in. Generate your first personalised recommendations whenever you are ready.'
      : "You haven't completed an assessment yet, so there's no performance data to analyse. Take a quick test on a topic you've studied to get your first personalised recommendation.",
    performance: ctx.performance,
    recommendations: [],
    needsGeneration: ctx.performance.hasData,
    stale: false,
  });
}

export async function POST(request: Request) {
  const ctx = await loadContext();
  if (!ctx) return NextResponse.json({ error: 'You need to be logged in to do this.' }, { status: 401 });

  const parsed = await parseJsonBody(request, MentorPostBodySchema);
  if (!parsed.ok) return parsed.response;

  if (!ctx.performance.hasData) {
    return NextResponse.json({
      summary:
        "You haven't completed an assessment yet, so there's no performance data to analyse. Take a quick test on a topic you've studied to get your first personalised recommendation.",
      performance: ctx.performance,
      recommendations: [],
      stale: false,
    });
  }

  // Nothing changed since the last run and the student did not insist: reuse it.
  if (ctx.snapshot && ctx.snapshot.input_hash === ctx.hash && !parsed.data.force) {
    return NextResponse.json(
      present(ctx.snapshot.payload as unknown as MentorRecommendation, ctx.performance, {
        stale: false,
        generatedAt: ctx.snapshot.created_at,
        cached: true,
      })
    );
  }

  const limited = await enforceRateLimit(ctx.user.id, 'mentor');
  if (limited) return limited;

  const overQuota = await enforceQuota(ctx.user.id, 'mentor');
  if (overQuota) return overQuota;

  const { supabase, user } = ctx;
  let result;
  try {
    result = await mentorGraph.invoke(
      { userId: user.id, mentorDisplayName: ctx.mentorName, language: ctx.prefs.language },
      {
        configurable: {
          computePerformance: async () => ctx.performance,
          fetchLearnerContext: (userId) => fetchAllLearnerContext(supabase, userId),
          fetchRecentTutorQuestions: (userId) => fetchRecentTutorQuestions(supabase, userId),
        } satisfies MentorGraphConfigurable,
      }
    );
  } catch (err) {
    const busy = err instanceof AllProvidersFailedError;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'The mentor could not produce a recommendation right now.' },
      { status: busy ? 503 : 502 }
    );
  }

  if (result.error || !result.recommendation) {
    return NextResponse.json(
      { error: result.error ?? 'The mentor could not produce a recommendation right now.' },
      { status: aiErrorStatus(result.error) }
    );
  }

  const recommendation = result.recommendation;
  const admin = createServiceRoleClient();
  const hashChanged = !ctx.snapshot || ctx.snapshot.input_hash !== ctx.hash;

  await admin.from('mentor_snapshots').upsert(
    {
      user_id: user.id,
      input_hash: ctx.hash,
      payload: recommendation as unknown as Json,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  // History rows are written once per *distinct* set of results, never on a
  // plain re-fetch or a forced refresh of identical data.
  if (hashChanged) {
    await supabase.from('mentor_recommendations').insert(
      recommendation.recommendations.map((r) => ({
        user_id: user.id,
        recommendation: `${r.topic}: ${r.action}`,
        reason: r.reason,
      }))
    );
  }

  return NextResponse.json(
    present(recommendation, ctx.performance, { stale: false, generatedAt: new Date().toISOString() })
  );
}
