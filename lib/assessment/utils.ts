/** Pure helpers for assessment generation/grading (unit-tested, no I/O). */

/** Lower-cases, strips punctuation and collapses whitespace: "CPU  Scheduling." -> "cpu scheduling". */
export function normalizeConceptName(name: string): string {
  return name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ') // \p{M}: Devanagari vowel signs/viramas are combining marks
    .replace(/\s+/g, ' ')
    .trim();
}

/** Fisher–Yates shuffle returning a new array. `random` is injectable for tests. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export interface ConceptRef {
  id: string;
  name: string;
}

/**
 * Looks a model-supplied concept label up among a topic's known concepts
 * (keyed by normalised name) so "CPU Scheduling" and "cpu scheduling." share one id.
 */
export function resolveConcept(
  label: string,
  known: Map<string, ConceptRef>
): { normalized: string; existing: ConceptRef | null } {
  const normalized = normalizeConceptName(label);
  const exact = known.get(normalized);
  if (exact) return { normalized, existing: exact };
  return { normalized, existing: null };
}

/** Recency-weighted mean (newest first). Weight decays by `decay` per step back in time. */
export function recencyWeightedMean(scoresNewestFirst: number[], decay = 0.6): number {
  if (scoresNewestFirst.length === 0) return 0;
  let weight = 1;
  let weighted = 0;
  let total = 0;
  for (const score of scoresNewestFirst) {
    weighted += score * weight;
    total += weight;
    weight *= decay;
  }
  return weighted / total;
}

export function difficultyForScore(score: number | null | undefined): 'easy' | 'medium' | 'hard' | null {
  if (score == null) return null;
  if (score >= 80) return 'hard';
  if (score >= 50) return 'medium';
  return 'easy';
}

export function scoreMessage(score: number): { emoji: string; headline: string; body: string } {
  if (score >= 80) return { emoji: '🎉', headline: 'Excellent work!', body: 'You clearly know this topic well.' };
  if (score >= 50) return { emoji: '👍', headline: 'Good progress!', body: 'You have the basics — review the missed points and try again.' };
  return {
    emoji: '🌱',
    headline: 'Keep going — every attempt teaches you something.',
    body: 'Re-read your notes on the concepts below, then retake the quiz. Improvement comes quickly with practice.',
  };
}
