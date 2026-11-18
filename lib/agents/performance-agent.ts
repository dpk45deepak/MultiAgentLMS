import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeConceptName, recencyWeightedMean } from '@/lib/assessment/utils';

export interface PerformanceBreakdown {
  strong: string[];
  moderate: string[];
  weak: string[];
  /** True when the student has at least one recorded assessment result. */
  hasData: boolean;
}

export interface PerformanceRow {
  concept: string;
  concept_id?: string | null;
  score: number;
}

export const STRONG_THRESHOLD = 75;
export const MODERATE_THRESHOLD = 50;
/** Only a concept's most recent attempts count, so an improving student stops looking weak. */
export const RECENT_ATTEMPTS_PER_CONCEPT = 5;
/** Each older attempt counts this fraction as much as the one after it. */
export const RECENCY_DECAY = 0.6;

/**
 * Pure bucketing step (unit-tested without a database). `rowsNewestFirst` must
 * be ordered newest first. Records are grouped by `concept_id` when present,
 * otherwise by the normalised concept name, so "CPU Scheduling" and
 * "cpu scheduling." are one concept. Each concept's score is a
 * recency-weighted mean of its last RECENT_ATTEMPTS_PER_CONCEPT results.
 */
export function bucketPerformance(rowsNewestFirst: PerformanceRow[]): PerformanceBreakdown {
  if (rowsNewestFirst.length === 0) return { strong: [], moderate: [], weak: [], hasData: false };

  const groups = new Map<string, { label: string; scores: number[] }>();
  for (const row of rowsNewestFirst) {
    const key = row.concept_id ? `id:${row.concept_id}` : `n:${normalizeConceptName(row.concept)}`;
    const group = groups.get(key) ?? { label: row.concept, scores: [] };
    if (group.scores.length < RECENT_ATTEMPTS_PER_CONCEPT) group.scores.push(row.score);
    groups.set(key, group);
  }

  const strong: string[] = [];
  const moderate: string[] = [];
  const weak: string[] = [];

  groups.forEach(({ label, scores }) => {
    const weighted = recencyWeightedMean(scores, RECENCY_DECAY);
    if (weighted >= STRONG_THRESHOLD) strong.push(label);
    else if (weighted >= MODERATE_THRESHOLD) moderate.push(label);
    else weak.push(label);
  });

  return { strong, moderate, weak, hasData: true };
}

/**
 * PERFORMANCE_AGENT — internal id: PERFORMANCE_AGENT.
 *
 * Deterministic aggregation, not an LLM call, so MENTOR_AGENT's
 * recommendations are always grounded in numbers actually computed from
 * `performance_records`. Buckets: >= 75% strong, 50-74% moderate, < 50% weak,
 * using recency weighting (see bucketPerformance).
 */
export async function computePerformanceBreakdown(
  supabase: SupabaseClient,
  userId: string
): Promise<PerformanceBreakdown> {
  const { data, error } = await supabase
    .from('performance_records')
    .select('concept, concept_id, score, recorded_at')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false })
    .limit(500);

  if (error || !data || data.length === 0) {
    return { strong: [], moderate: [], weak: [], hasData: false };
  }

  return bucketPerformance(data as PerformanceRow[]);
}
