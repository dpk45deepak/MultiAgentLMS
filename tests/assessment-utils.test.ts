import { describe, it, expect } from 'vitest';
import {
  normalizeConceptName,
  shuffle,
  recencyWeightedMean,
  difficultyForScore,
  scoreMessage,
} from '@/lib/assessment/utils';

describe('normalizeConceptName', () => {
  it('collapses case, punctuation and whitespace', () => {
    expect(normalizeConceptName('CPU  Scheduling.')).toBe('cpu scheduling');
    expect(normalizeConceptName('  cpu-scheduling ')).toBe('cpu scheduling');
    expect(normalizeConceptName("Banker's Algorithm")).toBe('banker s algorithm');
  });

  it('keeps non-latin letters (Hindi concept names)', () => {
    expect(normalizeConceptName('प्रक्रिया प्रबंधन')).toContain('प्रक्रिया');
  });

  it('returns an empty string for punctuation-only labels', () => {
    expect(normalizeConceptName('!!!')).toBe('');
  });
});

describe('shuffle', () => {
  it('keeps every element, does not mutate the input, and is deterministic for a given rng', () => {
    const input = ['a', 'b', 'c', 'd'];
    let seed = 1;
    const rng = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const out = shuffle(input, rng);
    expect(out.slice().sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(input).toEqual(['a', 'b', 'c', 'd']);
    seed = 1;
    expect(shuffle(input, rng)).toEqual(out);
  });
});

describe('recencyWeightedMean', () => {
  it('equals the plain mean for a single score', () => {
    expect(recencyWeightedMean([80])).toBe(80);
  });
  it('weights the newest score most', () => {
    expect(recencyWeightedMean([100, 0])).toBeGreaterThan(50);
    expect(recencyWeightedMean([0, 100])).toBeLessThan(50);
  });
  it('is 0 for no data', () => {
    expect(recencyWeightedMean([])).toBe(0);
  });
});

describe('difficultyForScore / scoreMessage', () => {
  it('maps the last score to the next difficulty', () => {
    expect(difficultyForScore(90)).toBe('hard');
    expect(difficultyForScore(60)).toBe('medium');
    expect(difficultyForScore(20)).toBe('easy');
    expect(difficultyForScore(null)).toBeNull();
  });

  it('only celebrates good scores', () => {
    expect(scoreMessage(95).emoji).toBe('🎉');
    expect(scoreMessage(0).emoji).not.toBe('🎉');
    expect(scoreMessage(0).headline.toLowerCase()).toContain('keep going');
  });
});
