import { describe, it, expect } from 'vitest';
import { calculateStreak } from '@/lib/streak';

// Fixed "now" so the tests aren't sensitive to the day they're run.
const NOW = new Date('2026-09-13T12:00:00.000Z'); // a Sunday

function iso(dateStr: string) {
  return `${dateStr}T09:00:00.000Z`;
}

describe('calculateStreak', () => {
  it('returns all zeros for no activity', () => {
    const result = calculateStreak([], NOW);
    expect(result).toEqual({ currentStreak: 0, longestStreak: 0, totalActiveDays: 0, activeDayKeys: [] });
  });

  it('counts a single session today as a streak of 1', () => {
    const result = calculateStreak([iso('2026-09-13')], NOW);
    expect(result.currentStreak).toBe(1);
    expect(result.totalActiveDays).toBe(1);
  });

  it('does not double-count multiple sessions on the same day', () => {
    const result = calculateStreak(
      [iso('2026-09-13'), iso('2026-09-13'), '2026-09-13T23:59:59.000Z'],
      NOW
    );
    expect(result.totalActiveDays).toBe(1);
    expect(result.currentStreak).toBe(1);
  });

  it('counts consecutive days ending today', () => {
    const result = calculateStreak(
      [iso('2026-09-11'), iso('2026-09-12'), iso('2026-09-13')],
      NOW
    );
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
  });

  it('keeps the streak alive if yesterday (not today) was the last active day', () => {
    const result = calculateStreak(
      [iso('2026-09-10'), iso('2026-09-11'), iso('2026-09-12')],
      NOW
    );
    expect(result.currentStreak).toBe(3);
  });

  it('resets to 0 if the most recent activity was 2+ days ago', () => {
    const result = calculateStreak([iso('2026-09-10')], NOW);
    expect(result.currentStreak).toBe(0);
  });

  it('breaks the current streak across a gap but still finds the longest streak historically', () => {
    const result = calculateStreak(
      [iso('2026-09-01'), iso('2026-09-02'), iso('2026-09-03'), iso('2026-09-04'), iso('2026-09-13')],
      NOW
    );
    expect(result.currentStreak).toBe(1); // only today
    expect(result.longestStreak).toBe(4); // the Sept 1-4 run
    expect(result.totalActiveDays).toBe(5);
  });
});

describe('timezone-aware streaks', () => {
  // 19:00Z on 10 Mar is 00:30 IST on 11 Mar; 02:00Z on 11 Mar is 07:30 IST on 11 Mar.
  const lateUtc = '2026-03-10T19:00:00Z';
  const earlyUtc = '2026-03-11T02:00:00Z';
  const now = new Date('2026-03-11T03:00:00Z');

  it('puts both sessions on the same local day in Asia/Kolkata', async () => {
    const { calculateStreak } = await import('@/lib/streak');
    expect(calculateStreak([lateUtc, earlyUtc], now, 'Asia/Kolkata').totalActiveDays).toBe(1);
  });

  it('still counts them as two UTC days by default', async () => {
    const { calculateStreak } = await import('@/lib/streak');
    expect(calculateStreak([lateUtc, earlyUtc], now).totalActiveDays).toBe(2);
  });

  it('computes a streak from localised day keys', async () => {
    const { calculateStreakFromDayKeys } = await import('@/lib/streak');
    const result = calculateStreakFromDayKeys(['2026-03-09', '2026-03-10', '2026-03-11'], '2026-03-11');
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
  });

  it('keeps yesterday\u2019s streak alive but resets after a missed day', async () => {
    const { calculateStreakFromDayKeys } = await import('@/lib/streak');
    expect(calculateStreakFromDayKeys(['2026-03-09', '2026-03-10'], '2026-03-11').currentStreak).toBe(2);
    expect(calculateStreakFromDayKeys(['2026-03-08', '2026-03-09'], '2026-03-11').currentStreak).toBe(0);
  });

  it('validates timezones and falls back safely', async () => {
    const { isValidTimezone, normalizeTimezone } = await import('@/lib/streak');
    expect(isValidTimezone('Asia/Kolkata')).toBe(true);
    expect(isValidTimezone('Mars/Olympus')).toBe(false);
    expect(normalizeTimezone('Mars/Olympus')).toBe('Asia/Kolkata');
    expect(normalizeTimezone(null)).toBe('Asia/Kolkata');
  });
});
