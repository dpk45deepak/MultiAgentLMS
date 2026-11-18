/**
 * Preferred-language instruction shared by every prompt builder
 * (user_preferences.preferred_language).
 *
 * Structured-output agents must keep the JSON *shape* — keys, enum values,
 * section keys, concept labels — in English so validation, grading and
 * concept matching keep working; only the human-readable prose changes.
 */
export type PreferredLanguage = 'english' | 'hindi' | 'hinglish';

export const PREFERRED_LANGUAGES: PreferredLanguage[] = ['english', 'hindi', 'hinglish'];

export function normalizeLanguage(value: unknown): PreferredLanguage {
  return value === 'hindi' || value === 'hinglish' ? value : 'english';
}

export function buildLanguageInstruction(language: PreferredLanguage | undefined): string {
  switch (language) {
    case 'hindi':
      return `LANGUAGE
Write all explanations, feedback and other human-readable prose in simple Hindi (Devanagari script). Keep technical terms, code, formulas, acronyms, JSON keys, enum values, and Mermaid/diagram syntax in English. Where a Hindi term may be unfamiliar, put the English term in brackets the first time it appears.`;
    case 'hinglish':
      return `LANGUAGE
Write all explanations, feedback and other human-readable prose in Hinglish: conversational Hindi written in the Roman (Latin) script, mixed naturally with English technical terms, the way Indian students talk. Keep code, formulas, acronyms, JSON keys, enum values, and Mermaid/diagram syntax in English.`;
    default:
      return `LANGUAGE
Write in clear English.`;
  }
}

/** Where a prompt demands a fixed English vocabulary regardless of the output language. */
export const KEEP_ENGLISH_STRUCTURE_NOTE =
  'Regardless of the output language, "concept" labels, section "key" values, "type", "difficulty" and every JSON key MUST stay exactly as specified in English.';
