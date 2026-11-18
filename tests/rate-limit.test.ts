import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, rateLimitResponse, __resetRateLimitMemory, RATE_LIMITS } from '@/lib/rate-limit';

const RULE = [{ limit: 2, windowSeconds: 60 }];

beforeEach(() => {
  __resetRateLimitMemory();
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

describe('rate limiter (in-memory fallback)', () => {
  it('allows up to the limit then blocks with a Retry-After', async () => {
    const t = 1_000_000;
    expect((await checkRateLimit('u1', 'tutor_chat', RULE, t)).ok).toBe(true);
    expect((await checkRateLimit('u1', 'tutor_chat', RULE, t + 1000)).ok).toBe(true);
    const blocked = await checkRateLimit('u1', 'tutor_chat', RULE, t + 2000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it('resets after the window', async () => {
    const t = 5_000_000;
    await checkRateLimit('u1', 'mentor', RULE, t);
    await checkRateLimit('u1', 'mentor', RULE, t);
    expect((await checkRateLimit('u1', 'mentor', RULE, t)).ok).toBe(false);
    expect((await checkRateLimit('u1', 'mentor', RULE, t + 61_000)).ok).toBe(true);
  });

  it('counts users and routes independently', async () => {
    const t = 9_000_000;
    await checkRateLimit('u1', 'mentor', RULE, t);
    await checkRateLimit('u1', 'mentor', RULE, t);
    expect((await checkRateLimit('u1', 'mentor', RULE, t)).ok).toBe(false);
    expect((await checkRateLimit('u2', 'mentor', RULE, t)).ok).toBe(true);
    expect((await checkRateLimit('u1', 'notes_generate', RULE, t)).ok).toBe(true);
  });

  it('requires every rule (burst and daily) to pass', async () => {
    const rules = [
      { limit: 5, windowSeconds: 60 },
      { limit: 2, windowSeconds: 86_400 },
    ];
    const t = 20_000_000;
    await checkRateLimit('u1', 'assessment_submit', rules, t);
    await checkRateLimit('u1', 'assessment_submit', rules, t);
    const blocked = await checkRateLimit('u1', 'assessment_submit', rules, t);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(60);
  });

  it('builds a friendly 429 with a Retry-After header', async () => {
    const res = rateLimitResponse({ ok: false, retryAfterSeconds: 42 });
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('42');
    const body = await res.json();
    expect(body.error).toContain('42 seconds');
  });

  it('defines limits for every AI route', () => {
    for (const route of ['notes_generate', 'assessment_generate', 'assessment_submit', 'tutor_chat', 'mentor', 'syllabus_analyze'] as const) {
      expect(RATE_LIMITS[route].length).toBeGreaterThan(0);
    }
  });
});
