import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import type { RateLimitedRoute } from '@/lib/rate-limit';
import { setUsageContext } from './context';
import './record'; // registers the LLM usage sink

export type QuotaFeature = RateLimitedRoute;

/** Credits charged per billable request. Tune with your measured cost per feature. */
export const FEATURE_CREDITS: Record<QuotaFeature, number> = {
  notes_generate: 5,
  assessment_generate: 3,
  assessment_submit: 2,
  tutor_chat: 1,
  mentor: 2,
  syllabus_analyze: 3,
};

export interface QuotaInput {
  monthlyCredits: number;
  creditsUsed: number;
  featureLimit: number | null;
  featureRequests: number;
  cost: number;
}

export interface QuotaDecision {
  allowed: boolean;
  reason?: 'credits' | 'feature_limit';
  remainingCredits: number;
}

/** Pure decision function (unit-tested). */
export function evaluateQuota(input: QuotaInput): QuotaDecision {
  const remainingCredits = Math.max(0, input.monthlyCredits - input.creditsUsed);
  if (input.featureLimit != null && input.featureRequests >= input.featureLimit) {
    return { allowed: false, reason: 'feature_limit', remainingCredits };
  }
  if (remainingCredits < input.cost) {
    return { allowed: false, reason: 'credits', remainingCredits };
  }
  return { allowed: true, remainingCredits: remainingCredits - input.cost };
}

export function startOfMonthUtc(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export function quotasEnabled(): boolean {
  return process.env.QUOTAS_ENABLED === 'true';
}

/**
 * Call right after verifying the user in an AI route.
 *
 *  - Always attributes the request's LLM calls to the user + feature
 *    (usage_events metering).
 *  - When QUOTAS_ENABLED=true, checks the user's plan allowance (monthly
 *    credit pool and the plan's per-feature cap) and, if allowed, charges the
 *    request. Returns a ready-made 402 response when the allowance is used up.
 *  - Fails OPEN on infrastructure errors (e.g. migration 005 not applied yet):
 *    a billing-table problem must not take the tutor down. It is logged.
 *
 * Usage metering is calendar-month based (UTC).
 */
export async function enforceQuota(userId: string, feature: QuotaFeature): Promise<NextResponse | null> {
  setUsageContext({ userId, feature });
  if (!quotasEnabled()) return null;

  try {
    const admin = createServiceRoleClient();
    const now = new Date();

    const { data: sub } = await admin
      .from('subscriptions')
      .select('plan_id, status, current_period_end')
      .eq('user_id', userId)
      .maybeSingle();

    const subscriptionActive =
      !!sub &&
      (sub.status === 'active' || sub.status === 'trialing') &&
      (!sub.current_period_end || new Date(sub.current_period_end) > now);

    let planQuery = admin.from('plans').select('id, name, monthly_credits');
    planQuery = subscriptionActive ? planQuery.eq('id', sub!.plan_id) : planQuery.eq('is_default', true);
    const { data: plan } = await planQuery.maybeSingle();
    if (!plan) {
      logger.warn('quota: no plan found, allowing request', { userId });
      return null;
    }

    const [{ data: entitlement }, { data: usage }] = await Promise.all([
      admin.from('entitlements').select('monthly_limit').eq('plan_id', plan.id).eq('feature', feature).maybeSingle(),
      admin.rpc('get_monthly_usage', { p_user_id: userId, p_since: startOfMonthUtc(now) }),
    ]);

    const rows = (usage ?? []) as { feature: string; requests: number; credits: number }[];
    const decision = evaluateQuota({
      monthlyCredits: plan.monthly_credits,
      creditsUsed: rows.reduce((sum, r) => sum + Number(r.credits), 0),
      featureLimit: entitlement?.monthly_limit ?? null,
      featureRequests: Number(rows.find((r) => r.feature === feature)?.requests ?? 0),
      cost: FEATURE_CREDITS[feature],
    });

    if (!decision.allowed) {
      return NextResponse.json(
        {
          error:
            decision.reason === 'feature_limit'
              ? `You've reached this month's limit for this feature on the ${plan.name} plan.`
              : `You've used all of this month's credits on the ${plan.name} plan.`,
          quota: true,
          plan: plan.id,
        },
        { status: 402 }
      );
    }

    await admin.from('usage_events').insert({
      user_id: userId,
      event_type: 'request',
      feature,
      credits: FEATURE_CREDITS[feature],
    });
    return null;
  } catch (err) {
    logger.error('quota check failed; allowing request', { error: err, userId, feature });
    return null;
  }
}
