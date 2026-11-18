import { describe, it, expect } from 'vitest';
import { cleanName, nameKey, cleanSyllabus } from '@/lib/syllabus/names';

describe('name helpers', () => {
  it('cleans whitespace and caps length at 120', () => {
    expect(cleanName('  Operating   Systems ')).toBe('Operating Systems');
    expect(cleanName('x'.repeat(300)).length).toBe(120);
  });
  it('compares case-insensitively', () => {
    expect(nameKey('Operating  Systems')).toBe(nameKey('operating systems'));
  });
});

describe('cleanSyllabus', () => {
  it('merges repeated units, dedupes topics across the syllabus, and drops empties', () => {
    const out = cleanSyllabus([
      { name: 'Unit 1', topics: [{ name: 'Deadlocks', subtopics: ['Detection', 'detection', ' '] }, { name: 'deadlocks', subtopics: [] }] },
      { name: 'unit  1', topics: [{ name: 'Paging', subtopics: [] }] },
      { name: 'Unit 2', topics: [{ name: '  ', subtopics: [] }] },
    ]);
    expect(out.map((u) => u.name)).toEqual(['Unit 1']);
    expect(out[0].topics.map((t) => t.name)).toEqual(['Deadlocks', 'Paging']);
    expect(out[0].topics[0].subtopics).toEqual(['Detection']);
  });

  it('keeps first-seen order', () => {
    const out = cleanSyllabus([
      { name: 'B', topics: [{ name: 'b1', subtopics: [] }] },
      { name: 'A', topics: [{ name: 'a1', subtopics: [] }] },
    ]);
    expect(out.map((u) => u.name)).toEqual(['B', 'A']);
  });
});
