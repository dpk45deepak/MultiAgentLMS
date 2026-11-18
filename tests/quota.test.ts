import { describe, it, expect } from 'vitest';
import { evaluateQuota, startOfMonthUtc, FEATURE_CREDITS } from '@/lib/usage/quota';
import { estimateCostUsd, estimateTokens } from '@/lib/usage/pricing';

describe('evaluateQuota', () => {
  const base = { monthlyCredits: 100, creditsUsed: 0, featureLimit: null, featureRequests: 0, cost: 5 };

  it('allows and reports remaining credits', () => {
    expect(evaluateQuota(base)).toEqual({ allowed: true, remainingCredits: 95 });
  });

  it('blocks when the credit pool cannot cover the cost', () => {
    const d = evaluateQuota({ ...base, creditsUsed: 98 });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe('credits');
  });

  it('allows an exact fit', () => {
    expect(evaluateQuota({ ...base, creditsUsed: 95 }).allowed).toBe(true);
  });

  it('enforces the per-feature cap before credits', () => {
    const d = evaluateQuota({ ...base, featureLimit: 3, featureRequests: 3 });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe('feature_limit');
  });
});

describe('usage helpers', () => {
  it('starts the month at 00:00 UTC on the 1st', () => {
    expect(startOfMonthUtc(new Date('2026-11-15T10:00:00Z'))).toBe('2026-11-01T00:00:00.000Z');
  });

  it('charges credits for every metered feature', () => {
    for (const cost of Object.values(FEATURE_CREDITS)) expect(cost).toBeGreaterThan(0);
  });

  it('estimates tokens and cost', () => {
    expect(estimateTokens(400)).toBe(100);
    expect(estimateCostUsd('openai/gpt-oss-120b', 1_000_000, 0)).toBeCloseTo(0.15, 5);
    expect(estimateCostUsd('some-unknown-model', 0, 0)).toBe(0);
  });
});
