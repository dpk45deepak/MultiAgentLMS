import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { dayKeyInTimezone, normalizeTimezone, streakFromActiveDays, type StreakResult } from '@/lib/streak';

/** Days of history the streak/calendar looks back over (one RPC row per active day, so far below PostgREST's 1000-row cap). */
export const STREAK_WINDOW_DAYS = 366;

/**
 * Streak for the signed-in user, computed from the `get_active_days` RPC
 * (distinct local dates) instead of downloading every learning_sessions row.
 */
export async function fetchStreak(
  supabase: SupabaseClient,
  timeZone: string | null | undefined
): Promise<{ streak: StreakResult; todayKey: string; error: boolean }> {
  const tz = normalizeTimezone(timeZone);
  const todayKey = dayKeyInTimezone(new Date(), tz);

  const { data, error } = await supabase.rpc('get_active_days', { p_tz: tz, p_days: STREAK_WINDOW_DAYS });
  if (error) {
    logger.error('get_active_days failed', { error });
    return { streak: streakFromActiveDays([], tz), todayKey, error: true };
  }

  const days = ((data ?? []) as { day: string }[]).map((r) => r.day);
  return { streak: streakFromActiveDays(days, tz), todayKey, error: false };
}
