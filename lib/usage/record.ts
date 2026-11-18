import { createServiceRoleClient } from '@/lib/supabase/admin';
import { setLlmUsageSink, type LlmCallReport } from '@/lib/ai/usage-hook';
import { logger } from '@/lib/logger';
import { estimateCostUsd, estimateTokens } from './pricing';
import { getUsageContext } from './context';

export interface UsageEventInput {
  userId: string;
  feature: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
}

/**
 * Persists one LLM call (user, feature, provider, model, tokens in/out,
 * estimated cost). Fire-and-forget: metering failures are logged, never thrown.
 */
export async function recordUsage(event: UsageEventInput): Promise<void> {
  try {
    const admin = createServiceRoleClient();
    const { error } = await admin.from('usage_events').insert({
      user_id: event.userId,
      event_type: 'llm_call',
      feature: event.feature,
      provider: event.provider,
      model: event.model,
      tokens_in: event.tokensIn,
      tokens_out: event.tokensOut,
      cost_usd: estimateCostUsd(event.model, event.tokensIn, event.tokensOut),
    });
    if (error) logger.warn('usage_events insert failed', { error });
  } catch (err) {
    logger.warn('recordUsage failed', { error: err });
  }
}

// Registered once when this module is first imported (by the quota helper that every AI route uses).
setLlmUsageSink((report: LlmCallReport) => {
  const ctx = getUsageContext();
  if (!ctx) return; // not inside an authenticated request (tests, scripts)
  void recordUsage({
    userId: ctx.userId,
    feature: ctx.feature,
    provider: report.provider,
    model: report.model,
    tokensIn: estimateTokens(report.inputChars),
    tokensOut: estimateTokens(report.outputChars),
  });
});
