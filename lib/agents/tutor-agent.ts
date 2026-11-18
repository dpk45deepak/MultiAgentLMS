import type { BaseMessageLike } from '@langchain/core/messages';
import { getStructuredModel } from '@/lib/ai/gemini';
import { buildTutorSystemPrompt } from '@/prompts/tutor';
import type { PreferredLanguage } from '@/prompts/language';

export type TutorMode = 'beginner' | 'normal' | 'exam_focused' | 'deep';

export interface TutorChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface TutorAgentInput {
  topicName: string;
  subjectName: string;
  mode: TutorMode;
  tutorDisplayName: string;
  /** Short-term memory: recent turns in this session, oldest first. */
  history: TutorChatTurn[];
  message: string;
  language?: PreferredLanguage;
}

function buildTutorMessages(input: TutorAgentInput): BaseMessageLike[] {
  const systemPrompt = buildTutorSystemPrompt({
    topicName: input.topicName,
    subjectName: input.subjectName,
    mode: input.mode,
    tutorDisplayName: input.tutorDisplayName,
    language: input.language,
  });

  return [
    ['system', systemPrompt],
    ...input.history.map((turn): BaseMessageLike => [turn.role, turn.content]),
    ['user', input.message],
  ];
}

/**
 * TUTOR_AGENT — internal id: TUTOR_AGENT.
 * Unlike the notes/assessment/mentor agents, this one returns plain text,
 * not a validated JSON structure — a conversational reply isn't the kind of
 * output that benefits from a schema (see requirement #15's validation list,
 * which does not include tutor chat). Callers should still guard against an
 * empty response.
 */
export async function runTutorAgent(input: TutorAgentInput): Promise<string> {
  const model = getStructuredModel({ temperature: 0.5, maxOutputTokens: 2048 });
  const messages = buildTutorMessages(input);

  const response = await model.invoke(messages);
  const text = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

  if (!text.trim()) {
    throw new Error('The tutor returned an empty response. Please try asking again.');
  }

  return text.trim();
}

/**
 * Streaming variant of runTutorAgent: yields the reply text as it is
 * generated (falls back to a single chunk if no provider can stream).
 * Callers are responsible for persistence; nothing is saved here.
 */
export async function* streamTutorAgent(input: TutorAgentInput): AsyncGenerator<string, void, void> {
  const model = getStructuredModel({ temperature: 0.5, maxOutputTokens: 2048 });
  const messages = buildTutorMessages(input);

  if (typeof model.streamText === 'function') {
    yield* model.streamText(messages);
    return;
  }
  const response = await model.invoke(messages);
  const text = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
  if (!text.trim()) throw new Error('The tutor returned an empty response. Please try asking again.');
  yield text.trim();
}
