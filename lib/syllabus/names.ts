/** Pure name helpers for subjects/units/topics (unit-tested). */

export const MAX_NAME_LENGTH = 120;

/** Collapses whitespace, trims and caps length: the form we store and show. */
export function cleanName(name: string): string {
  return name.normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);
}

/** Case-insensitive comparison key: "Operating  Systems" == "operating systems". */
export function nameKey(name: string): string {
  return cleanName(name).toLowerCase();
}

/** Existing topics are keyed by this (matches topics.normalized_name). */
export function topicNormalizedName(name: string): string {
  return nameKey(name);
}

export interface SyllabusTopic {
  name: string;
  subtopics: string[];
}
export interface SyllabusUnit {
  name: string;
  topics: SyllabusTopic[];
}

/**
 * Cleans a model-produced syllabus: normalises names, drops empty/duplicate
 * units, topics (across the whole syllabus — one topic row per normalised
 * name) and subtopics. Keeps first-seen order.
 */
export function cleanSyllabus(units: SyllabusUnit[]): SyllabusUnit[] {
  const seenUnits = new Map<string, SyllabusUnit>();
  const seenTopics = new Set<string>();
  const ordered: SyllabusUnit[] = [];

  for (const unit of units) {
    const unitName = cleanName(unit.name) || 'General';
    const unitKey = nameKey(unitName);
    let target = seenUnits.get(unitKey);
    if (!target) {
      target = { name: unitName, topics: [] };
      seenUnits.set(unitKey, target);
      ordered.push(target);
    }

    for (const topic of unit.topics) {
      const topicName = cleanName(topic.name);
      const key = topicNormalizedName(topicName);
      if (!topicName || seenTopics.has(key)) continue;
      seenTopics.add(key);

      const seenSub = new Set<string>();
      const subtopics: string[] = [];
      for (const sub of topic.subtopics ?? []) {
        const subName = cleanName(sub);
        const subKey = nameKey(subName);
        if (!subName || seenSub.has(subKey)) continue;
        seenSub.add(subKey);
        subtopics.push(subName);
      }
      target.topics.push({ name: topicName, subtopics });
    }
  }

  return ordered.filter((u) => u.topics.length > 0);
}
