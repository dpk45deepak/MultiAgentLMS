/**
 * Compact 12-week activity calendar, GitHub-contribution-graph style.
 * Pure presentational component driven by `activeDayKeys` from lib/streak.ts
 * — every filled cell corresponds to a real distinct day with a
 * `learning_sessions` row, never fabricated.
 */
export function ActivityCalendar({
  activeDayKeys,
  weeks = 12,
  todayKey,
}: {
  activeDayKeys: string[];
  weeks?: number;
  /** "YYYY-MM-DD" for today in the learner's timezone (computed on the server, so no hydration mismatch). */
  todayKey?: string;
}) {
  const activeSet = new Set(activeDayKeys);
  const today = new Date();
  const todayUTC = todayKey
    ? new Date(`${todayKey}T00:00:00.000Z`)
    : new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  // Align the grid to end on today, with full weeks (Sun-Sat) going back.
  const totalDays = weeks * 7;
  const startOffset = todayUTC.getUTCDay(); // 0 = Sunday
  const gridStart = new Date(todayUTC);
  gridStart.setUTCDate(gridStart.getUTCDate() - (totalDays - 1 - (6 - startOffset)));

  const days: { key: string; active: boolean; isFuture: boolean }[] = [];
  const cursor = new Date(gridStart);
  for (let i = 0; i < totalDays; i++) {
    const key = cursor.toISOString().slice(0, 10);
    days.push({ key, active: activeSet.has(key), isFuture: cursor.getTime() > todayUTC.getTime() });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const columns: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) columns.push(days.slice(i, i + 7));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-1.5 overflow-x-auto p-2.5 bg-[#FFFDF8] rounded-xl border border-[#D7EAFB]" role="img" aria-label={`Activity over the last ${weeks} weeks`}>
        {columns.map((col, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            {col.map((d) => (
              <div
                key={d.key}
                title={`${d.key}${d.active ? ' — active study session! ★' : ''}`}
                className={`h-3.5 w-3.5 rounded transition-transform hover:scale-125 ${
                  d.isFuture
                    ? 'bg-transparent'
                    : d.active
                    ? 'bg-[#B9D9F5] border border-[#8EBBE3] shadow-xs'
                    : 'bg-[#FFF9EE] border border-[#EBF4FD]'
                }`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-[#6C7C91] px-1 font-medium">
        <span>Less active</span>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-[#FFF9EE] border border-[#EBF4FD]" />
          <div className="h-3 w-3 rounded bg-[#D7EAFB] border border-[#B9D9F5]" />
          <div className="h-3 w-3 rounded bg-[#B9D9F5] border border-[#8EBBE3]" />
        </div>
        <span>Active day ★</span>
      </div>
    </div>
  );
}

