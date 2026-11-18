import { getStructuredModel } from '@/lib/ai/gemini';
import { generateStructured } from '@/lib/ai/structured';
import { NotesSchema, type Notes } from '@/lib/validation/schemas';
import { buildNotesSystemPrompt } from '@/prompts/notes';
import type { PreferredLanguage } from '@/prompts/language';

export interface NotesAgentInput {
  subject: string;
  topic: string;
  subtopics: string[];
  /** Learning-memory summaries relevant to this student/topic, if any. */
  learnerContext?: string[];
  /** user_preferences.preferred_language; defaults to English. */
  language?: PreferredLanguage;
}

const DEFAULT_SECTIONS = [
  'overview',
  'definition',
  'why_it_matters',
  'core_concept',
  'types',
  'working',
  'diagram',
  'advantages',
  'disadvantages',
  'applications',
  'examples',
  'exam_points',
  'quick_revision',
  'common_mistakes',
  'practice_questions',
] as const;

const RESPONSE_SCHEMA_DESCRIPTION = `{
  "topic": string,
  "sections": [ { "key": one of ${JSON.stringify(DEFAULT_SECTIONS)}, "title": string, "content_markdown": string } ]
}`;

/**
 * NOTES_AGENT — internal id: NOTES_AGENT.
 * Pure function: (subject, topic, subtopics, learner context) -> validated
 * Notes. Persistence happens in the caller (/api/notes/generate route).
 */
export async function runNotesAgent(input: NotesAgentInput): Promise<Notes> {
  const model = getStructuredModel({ temperature: 0.4, maxOutputTokens: 10000 });

  const contextBlock =
    input.learnerContext && input.learnerContext.length > 0
      ? `\n\nRELEVANT LEARNER CONTEXT (use to tailor emphasis, do not restate verbatim):\n- ${input.learnerContext.join('\n- ')}`
      : '';

  const instruction = `Generate complete but concise study notes for this topic. Produce ALL of these sections, in this order: ${DEFAULT_SECTIONS.join(', ')}. Keep each section focused so the complete JSON response stays within the output limit.

Subject: ${input.subject}
Topic: ${input.topic}
Subtopics to cover where relevant: ${input.subtopics.length ? input.subtopics.join(', ') : '(none listed — use your judgement)'}${contextBlock}

Return a JSON object matching exactly this shape:
${RESPONSE_SCHEMA_DESCRIPTION}`;

  return generateStructured(model, NotesSchema, [
    ['system', buildNotesSystemPrompt(input.language)],
    ['user', instruction],
  ]);
}
