import { NextResponse } from 'next/server';
import { z } from 'zod';

import { LIMITS } from './limits';

export { LIMITS };

const uuid = z.string().uuid('Invalid id.');
const tutorMode = z.enum(['beginner', 'normal', 'exam_focused', 'deep']);

export const NotesGenerateBodySchema = z.object({
  topicId: uuid,
  regenerate: z.boolean().optional(),
});

export const AssessmentGenerateBodySchema = z.object({
  topicId: uuid,
  difficulty: z.enum(['easy', 'medium', 'hard', 'adaptive']).default('adaptive'),
  includeShortAnswer: z.boolean().default(true),
  /** Skip the "reuse an unfinished quiz" shortcut and always generate a new one (retake). */
  forceNew: z.boolean().optional(),
});

export const AssessmentSubmitBodySchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: uuid,
        answer: z.string().max(LIMITS.shortAnswer, `Answers are limited to ${LIMITS.shortAnswer} characters.`),
      })
    )
    .min(1, 'No answers were submitted.')
    .max(LIMITS.maxAnswers, 'Too many answers.'),
});

export const TutorChatBodySchema = z
  .object({
    sessionId: uuid.optional(),
    topicId: uuid.optional(),
    mode: tutorMode.optional(),
    message: z
      .string()
      .trim()
      .min(1, 'Please type a message.')
      .max(LIMITS.tutorMessage, `Messages are limited to ${LIMITS.tutorMessage} characters.`),
    stream: z.boolean().optional(),
    /** Replace the last assistant reply with a fresh one. */
    regenerate: z.boolean().optional(),
  })
  .refine((b) => b.sessionId || b.topicId, { message: 'A session id or topic id is required.' });

export const TutorSessionCreateBodySchema = z.object({
  topicId: uuid,
  mode: tutorMode.optional(),
});

export const ManualTopicBodySchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required.').max(LIMITS.name, 'Subject name is too long.'),
  topic: z.string().trim().min(1, 'Topic is required.').max(LIMITS.name, 'Topic name is too long.'),
});

export const MentorPostBodySchema = z.object({ force: z.boolean().optional() }).default({});

export const PinnedItemBodySchema = z.object({
  itemKey: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(200),
  type: z.string().trim().min(1).max(40),
  href: z.string().trim().min(1).max(500).refine((h) => h.startsWith('/') && !h.startsWith('//'), 'Invalid link.'),
  badge: z.string().trim().max(60).optional(),
});

export type ParsedBody<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

/**
 * Reads, size-limits, JSON-parses and zod-validates a request body. An empty
 * body is treated as `{}` so schemas with all-optional fields still work.
 * Violations return a ready-made 400 (413 for oversized bodies).
 */
export async function parseJsonBody<S extends z.ZodTypeAny>(
  request: Request,
  schema: S
): Promise<ParsedBody<z.infer<S>>> {
  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }) };
  }

  if (text.length > LIMITS.jsonBodyChars) {
    return { ok: false, response: NextResponse.json({ error: 'That request is too large.' }, { status: 413 }) };
  }

  let json: unknown = {};
  if (text.trim().length > 0) {
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, response: NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }) };
    }
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    const message = result.error.issues[0]?.message || 'Invalid request.';
    return { ok: false, response: NextResponse.json({ error: message }, { status: 400 }) };
  }
  return { ok: true, data: result.data };
}
