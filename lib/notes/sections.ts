export interface RawSection {
  key: string;
  title: string;
  content_markdown: string;
}

/**
 * The model occasionally repeats a section key; (note_id, section_key) is
 * unique in the database, so a repeat would fail the whole insert. Keep the
 * first occurrence of each key (stable order) and drop empty bodies.
 */
export function dedupeSections<T extends RawSection>(sections: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const section of sections) {
    if (seen.has(section.key)) continue;
    if (!section.content_markdown || section.content_markdown.trim().length === 0) continue;
    seen.add(section.key);
    out.push(section);
  }
  return out;
}

/** A 'generating' placeholder older than this is treated as a crashed generation. */
export const STALE_GENERATING_MS = 5 * 60 * 1000;

export type NoteState = 'missing' | 'ready' | 'generating' | 'dead';

export function classifyNote(
  note: { generation_status: string; created_at: string; sectionCount: number } | null,
  now: number = Date.now()
): NoteState {
  if (!note) return 'missing';
  if (note.generation_status === 'ready' && note.sectionCount > 0) return 'ready';
  if (note.generation_status === 'generating') {
    return now - new Date(note.created_at).getTime() < STALE_GENERATING_MS ? 'generating' : 'dead';
  }
  // failed, or "ready" with zero sections (legacy dead-end rows)
  return 'dead';
}
