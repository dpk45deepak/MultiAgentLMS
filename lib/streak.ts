/**
 * Streak / consistency tracking.
 *
 * A streak is consecutive **calendar days** with at least one qualifying
 * learning activity (`learning_sessions` row) — not a count of sessions.
 * Multiple sessions on the same day count once.
 *
 * Days are computed in the learner's own IANA timezone (profiles.timezone),
 * so for a student in India the day rolls over at local midnight, not at
 * 05:30. `calculateStreak` still defaults to UTC for callers/tests that pass
 * no timezone.
 */

const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export function isValidTimezone(timeZone: string): boolean {
  if (typeof timeZone !== 'string' || timeZone.length === 0 || timeZone.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimezone(timeZone: string | null | undefined): string {
  return timeZone && isValidTimezone(timeZone) ? timeZone : DEFAULT_TIMEZONE;
}

/** "YYYY-MM-DD" of the given instant in the given IANA timezone. */
export function dayKeyInTimezone(date: Date | string, timeZone: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function dayKeyToUTCDate(dayKey: string): Date {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDays(dayKey: string, delta: number): string {
  const date = dayKeyToUTCDate(dayKey);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((dayKeyToUTCDate(a).getTime() - dayKeyToUTCDate(b).getTime()) / MS_PER_DAY);
}

export interface StreakResult {
  /** Consecutive active days ending today or yesterday. 0 if the streak is already broken. */
  currentStreak: number;
  /** Longest run of consecutive active days in the data provided. */
  longestStreak: number;
  /** Total distinct calendar days with at least one qualifying session. */
  totalActiveDays: number;
  /** Distinct active day keys ("YYYY-MM-DD"), ascending, for the activity calendar. */
  activeDayKeys: string[];
}

const EMPTY_STREAK: StreakResult = {
  currentStreak: 0,
  longestStreak: 0,
  totalActiveDays: 0,
  activeDayKeys: [],
};

/**
 * Core algorithm over already-localised day keys (e.g. the rows returned by
 * the `get_active_days` RPC). `todayKey` is today's date in the same zone.
 */
export function calculateStreakFromDayKeys(dayKeys: string[], todayKey: string): StreakResult {
  if (dayKeys.length === 0) return EMPTY_STREAK;

  const daySet = new Set(dayKeys);
  const sorted = Array.from(daySet).sort(); // "YYYY-MM-DD" sorts chronologically

  let longestStreak = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = daysBetween(sorted[i], sorted[i - 1]) === 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
  }

  // A student who studied every day but hasn't opened the app yet today
  // should not see 0: the streak is alive through yesterday.
  let cursor = todayKey;
  if (!daySet.has(cursor)) {
    cursor = addDays(todayKey, -1);
    if (!daySet.has(cursor)) {
      return { currentStreak: 0, longestStreak, totalActiveDays: daySet.size, activeDayKeys: sorted };
    }
  }

  let currentStreak = 0;
  while (daySet.has(cursor)) {
    currentStreak++;
    cursor = addDays(cursor, -1);
  }

  return { currentStreak, longestStreak, totalActiveDays: daySet.size, activeDayKeys: sorted };
}

/**
 * @param sessionTimestamps ISO timestamp strings, one per `learning_sessions` row
 *   (duplicates and same-day timestamps are expected and deduped here).
 * @param now Injectable for tests; defaults to the real current time.
 * @param timeZone IANA timezone used to decide which calendar day a session falls on. Defaults to UTC.
 */
export function calculateStreak(
  sessionTimestamps: string[],
  now: Date = new Date(),
  timeZone: string = 'UTC'
): StreakResult {
  if (sessionTimestamps.length === 0) return EMPTY_STREAK;
  const zone = isValidTimezone(timeZone) ? timeZone : 'UTC';
  return calculateStreakFromDayKeys(
    sessionTimestamps.map((t) => dayKeyInTimezone(t, zone)),
    dayKeyInTimezone(now, zone)
  );
}

/** Convenience for pages: fetch via the RPC rows, compute in the user's timezone. */
export function streakFromActiveDays(activeDays: string[], timeZone: string, now: Date = new Date()): StreakResult {
  return calculateStreakFromDayKeys(activeDays, dayKeyInTimezone(now, normalizeTimezone(timeZone)));
}
