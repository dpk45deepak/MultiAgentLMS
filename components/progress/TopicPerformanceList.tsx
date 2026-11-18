export interface TopicPerformance {
  topicId: string;
  topicName: string;
  averageScore: number;
  attempts: number;
}

function barColor(score: number) {
  if (score >= 75) return 'bg-[#64B587]';
  if (score >= 50) return 'bg-[#F2B04B]';
  return 'bg-[#E57388]';
}

export function TopicPerformanceList({ topics }: { topics: TopicPerformance[] }) {
  if (topics.length === 0) return null;

  return (
    <div className="flex flex-col gap-3.5">
      {topics.map((t) => (
        <div key={t.topicId} className="flex flex-col gap-1.5 p-2 rounded-xl hover:bg-[#FFFDF8] transition-colors">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-navy flex items-center gap-1.5">
              <span className="text-xs text-[#8EBBE3]">✦</span>
              {t.topicName}
            </span>
            <span className="text-xs font-medium text-navy-muted bg-[#D7EAFB]/40 px-2 py-0.5 rounded-full border border-[#D7EAFB]">
              {t.averageScore}% &middot; {t.attempts} attempt{t.attempts !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-[#D7EAFB]/40 p-0.5 border border-[#D7EAFB]" role="img" aria-label={`${t.topicName}: ${t.averageScore}% average`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor(t.averageScore)} shadow-xs`}
              style={{ width: `${Math.max(6, Math.min(100, t.averageScore))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

