import { describe, it, expect } from 'vitest';
import { dedupeSections, classifyNote, STALE_GENERATING_MS } from '@/lib/notes/sections';

const section = (key: string, body = 'content') => ({ key, title: key, content_markdown: body });

describe('dedupeSections', () => {
  it('keeps the first occurrence of a repeated key and preserves order', () => {
    const out = dedupeSections([section('a', '1'), section('b'), section('a', '2'), section('c')]);
    expect(out.map((s) => s.key)).toEqual(['a', 'b', 'c']);
    expect(out[0].content_markdown).toBe('1');
  });

  it('drops sections with empty bodies', () => {
    expect(dedupeSections([section('a', '   '), section('b')]).map((s) => s.key)).toEqual(['b']);
  });
});

describe('classifyNote', () => {
  const now = Date.parse('2026-01-01T12:00:00Z');
  const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

  it('treats a missing note as missing', () => {
    expect(classifyNote(null, now)).toBe('missing');
  });

  it('treats a ready note with sections as ready', () => {
    expect(classifyNote({ generation_status: 'ready', created_at: iso(1000), sectionCount: 5 }, now)).toBe('ready');
  });

  it('treats a "ready" note with ZERO sections as dead so it regenerates (no dead-end)', () => {
    expect(classifyNote({ generation_status: 'ready', created_at: iso(1000), sectionCount: 0 }, now)).toBe('dead');
  });

  it('treats failed notes as dead', () => {
    expect(classifyNote({ generation_status: 'failed', created_at: iso(1000), sectionCount: 0 }, now)).toBe('dead');
  });

  it('keeps a fresh generating note as generating, but a stale one as dead', () => {
    expect(classifyNote({ generation_status: 'generating', created_at: iso(10_000), sectionCount: 0 }, now)).toBe('generating');
    expect(classifyNote({ generation_status: 'generating', created_at: iso(STALE_GENERATING_MS + 1000), sectionCount: 0 }, now)).toBe('dead');
  });
});
