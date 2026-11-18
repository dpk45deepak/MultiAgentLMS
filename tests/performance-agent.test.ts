import { describe, it, expect } from 'vitest';
import { computePerformanceBreakdown, bucketPerformance } from '@/lib/agents/performance-agent';
import type { SupabaseClient } from '@supabase/supabase-js';

function fakeSupabase(rows: { concept: string; score: number }[] | null, error: unknown = null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: rows, error }),
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

describe('computePerformanceBreakdown', () => {
  it('reports hasData: false when there are no records', async () => {
    const result = await computePerformanceBreakdown(fakeSupabase([]), 'user-1');
    expect(result.hasData).toBe(false);
  });

  it('reports hasData: false on a query error', async () => {
    const result = await computePerformanceBreakdown(fakeSupabase(null, new Error('db down')), 'user-1');
    expect(result.hasData).toBe(false);
  });

  it('buckets concepts by averaged score across multiple attempts', async () => {
    const rows = [
      { concept: 'CPU Scheduling', score: 90 },
      { concept: 'CPU Scheduling', score: 80 }, // avg 85 -> strong
      { concept: 'Memory Management', score: 60 },
      { concept: 'Memory Management', score: 55 }, // avg 57.5 -> moderate
      { concept: 'Deadlocks', score: 30 },
      { concept: 'Deadlocks', score: 20 }, // avg 25 -> weak
    ];

    const result = await computePerformanceBreakdown(fakeSupabase(rows), 'user-1');

    expect(result.hasData).toBe(true);
    expect(result.strong).toEqual(['CPU Scheduling']);
    expect(result.moderate).toEqual(['Memory Management']);
    expect(result.weak).toEqual(['Deadlocks']);
  });

  it('treats exactly 75 as strong and exactly 50 as moderate (inclusive boundaries)', async () => {
    const rows = [
      { concept: 'Edge75', score: 75 },
      { concept: 'Edge50', score: 50 },
      { concept: 'Edge49', score: 49 },
    ];

    const result = await computePerformanceBreakdown(fakeSupabase(rows), 'user-1');

    expect(result.strong).toContain('Edge75');
    expect(result.moderate).toContain('Edge50');
    expect(result.weak).toContain('Edge49');
  });
});

describe('bucketPerformance', () => {
  it('weights recent attempts more than old ones (recent mastery beats an old slump)', () => {
    // newest first: three recent 100s after two old 0s. Plain mean is 60 (moderate);
    // recency weighting gives ~85 (strong).
    const result = bucketPerformance([
      { concept: 'Deadlocks', score: 100 },
      { concept: 'Deadlocks', score: 100 },
      { concept: 'Deadlocks', score: 100 },
      { concept: 'Deadlocks', score: 0 },
      { concept: 'Deadlocks', score: 0 },
    ]);
    expect(result.strong).toEqual(['Deadlocks']);
    expect(result.weak).toEqual([]);
  });

  it('marks a recently declining concept as weak even if the all-time average is high', () => {
    const result = bucketPerformance([
      { concept: 'Paging', score: 20 },
      { concept: 'Paging', score: 95 },
      { concept: 'Paging', score: 100 },
    ]);
    // weighted: (20 + 95*0.6 + 100*0.36) / 1.96 ~ 58 -> moderate, and certainly not strong
    expect(result.strong).toEqual([]);
  });

  it('merges differently-written names for the same concept', () => {
    const result = bucketPerformance([
      { concept: 'CPU Scheduling', score: 40 },
      { concept: 'cpu  scheduling.', score: 40 },
    ]);
    expect(result.weak).toEqual(['CPU Scheduling']);
  });

  it('groups by concept_id when present', () => {
    const result = bucketPerformance([
      { concept: 'Process Scheduling', concept_id: 'c1', score: 30 },
      { concept: 'CPU Scheduling', concept_id: 'c1', score: 30 },
    ]);
    expect(result.weak).toHaveLength(1);
  });

  it('only counts the most recent attempts per concept', () => {
    const rows = [
      ...Array.from({ length: 5 }, () => ({ concept: 'Sync', score: 100 })),
      ...Array.from({ length: 20 }, () => ({ concept: 'Sync', score: 0 })),
    ];
    expect(bucketPerformance(rows).strong).toEqual(['Sync']);
  });
});
