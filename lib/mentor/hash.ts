import { createHash } from 'crypto';
import type { PerformanceBreakdown } from '@/lib/agents/performance-agent';

/** Hash of everything a mentor recommendation depends on; same hash => cached answer is still valid. */
export function hashMentorInput(performance: PerformanceBreakdown, language: string, mentorName: string): string {
  const stable = {
    strong: [...performance.strong].sort(),
    moderate: [...performance.moderate].sort(),
    weak: [...performance.weak].sort(),
    language,
    mentorName,
  };
  return createHash('sha256').update(JSON.stringify(stable)).digest('hex');
}
