import { NextResponse } from 'next/server';

/**
 * Per-user rate limiting for the routes that spend LLM money.
 *
 * Backend: Upstash Redis (REST API, called with plain `fetch` — no extra
 * dependency) when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are
 * set; otherwise an in-memory fixed-window fallback. The in-memory fallback
 * is per server instance, so it is only a development convenience: on a
 * serverless host (Vercel) every cold instance has its own counters.
 */

export interface RateLimitRule {
  /** Max requests per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

export type RateLimitedRoute =
  | 'notes_generate'
  | 'assessment_generate'
  | 'assessment_submit'
  | 'tutor_chat'
  | 'mentor'
  | 'syllabus_analyze';

/** Every rule must pass. A short burst rule plus a longer daily rule per route. */
export const RATE_LIMITS: Record<RateLimitedRoute, RateLimitRule[]> = {
  notes_generate: [
    { limit: 3, windowSeconds: 60 },
    { limit: 30, windowSeconds: 24 * 3600 },
  ],
  assessment_generate: [
    { limit: 3, windowSeconds: 60 },
    { limit: 40, windowSeconds: 24 * 3600 },
  ],
  assessment_submit: [
    { limit: 5, windowSeconds: 60 },
    { limit: 60, windowSeconds: 24 * 3600 },
  ],
  tutor_chat: [
    { limit: 12, windowSeconds: 60 },
    { limit: 300, windowSeconds: 24 * 3600 },
  ],
  mentor: [
    { limit: 3, windowSeconds: 60 },
    { limit: 20, windowSeconds: 24 * 3600 },
  ],
  syllabus_analyze: [
    { limit: 3, windowSeconds: 60 },
    { limit: 20, windowSeconds: 24 * 3600 },
  ],
};

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the failing window resets (0 when ok). */
  retryAfterSeconds: number;
}

// ---------------------------------------------------------------------------
// In-memory fallback
// ---------------------------------------------------------------------------

interface Bucket {
  count: number;
  resetAt: number;
}
const memory = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  Array.from(memory.entries()).forEach(([key, bucket]) => {
    if (bucket.resetAt <= now) memory.delete(key);
  });
}

/** Test helper. */
export function __resetRateLimitMemory() {
  memory.clear();
  lastSweep = 0;
}

function memoryHit(key: string, rule: RateLimitRule, now: number): RateLimitResult {
  sweep(now);
  const existing = memory.get(key);
  if (!existing || existing.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + rule.windowSeconds * 1000 });
    return { ok: true, retryAfterSeconds: 0 };
  }
  existing.count += 1;
  if (existing.count > rule.limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }
  return { ok: true, retryAfterSeconds: 0 };
}

// ---------------------------------------------------------------------------
// Upstash REST backend (fixed window)
// ---------------------------------------------------------------------------

function upstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

async function upstashHit(
  config: { url: string; token: string },
  key: string,
  rule: RateLimitRule
): Promise<RateLimitResult> {
  const res = await fetch(`${config.url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      ['SET', key, '0', 'EX', String(rule.windowSeconds), 'NX'],
      ['INCR', key],
      ['TTL', key],
    ]),
    cache: 'no-store',
    signal: AbortSignal.timeout(2500),
  });
  if (!res.ok) throw new Error(`Upstash responded ${res.status}`);

  const out = (await res.json()) as { result?: unknown }[];
  const count = Number(out?.[1]?.result);
  const ttl = Number(out?.[2]?.result);
  if (!Number.isFinite(count)) throw new Error('Unexpected Upstash response');

  if (count > rule.limit) {
    return { ok: false, retryAfterSeconds: ttl > 0 ? ttl : rule.windowSeconds };
  }
  return { ok: true, retryAfterSeconds: 0 };
}

let warnedMemoryInProd = false;

export async function checkRateLimit(
  userId: string,
  route: RateLimitedRoute,
  rules: RateLimitRule[] = RATE_LIMITS[route],
  now: number = Date.now()
): Promise<RateLimitResult> {
  const upstash = upstashConfig();

  if (!upstash && process.env.NODE_ENV === 'production' && !warnedMemoryInProd) {
    warnedMemoryInProd = true;
    console.warn(
      '[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN are not set; using per-instance in-memory limits, which are NOT reliable on serverless hosts.'
    );
  }

  let worst: RateLimitResult = { ok: true, retryAfterSeconds: 0 };

  for (const rule of rules) {
    const key = `rl:${route}:${rule.windowSeconds}:${userId}`;
    let result: RateLimitResult;
    if (upstash) {
      try {
        result = await upstashHit(upstash, key, rule);
      } catch (err) {
        // Fail over to the in-memory counter rather than failing open entirely.
        console.error('[rate-limit] Upstash unavailable, using in-memory fallback', err);
        result = memoryHit(key, rule, now);
      }
    } else {
      result = memoryHit(key, rule, now);
    }
    if (!result.ok && result.retryAfterSeconds >= worst.retryAfterSeconds) worst = result;
  }

  return worst;
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const seconds = Math.max(1, result.retryAfterSeconds);
  const wait = seconds >= 120 ? `${Math.ceil(seconds / 60)} minutes` : `${seconds} seconds`;
  return NextResponse.json(
    { error: `You're going a little fast! Please wait about ${wait} and try again.` },
    { status: 429, headers: { 'Retry-After': String(seconds) } }
  );
}

/** Returns a ready-made 429 response when the user is over a limit, else null. */
export async function enforceRateLimit(userId: string, route: RateLimitedRoute): Promise<NextResponse | null> {
  const result = await checkRateLimit(userId, route);
  return result.ok ? null : rateLimitResponse(result);
}
