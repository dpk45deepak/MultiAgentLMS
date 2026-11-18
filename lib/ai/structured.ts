import type { z } from 'zod';
import type { BaseMessageLike } from '@langchain/core/messages';
import type { ChatModelLike } from '@/lib/ai/fallback-model';
import { responseText } from '@/lib/ai/response-text';
import { AllProvidersFailedError } from '@/lib/ai/fallback-model';

export class StructuredGenerationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'StructuredGenerationError';
  }
}

function parseJsonObject(raw: string): unknown {
  const cleaned = raw.replace(/^\uFEFF/, '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Some model responses add a short sentence before or after the JSON.
    // Extract the first balanced object while respecting quoted braces.
    const start = cleaned.indexOf('{');
    if (start < 0) throw new Error('Response was not valid JSON.');

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < cleaned.length; index++) {
      const character = cleaned[index];

      if (inString) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === '"') inString = false;
        continue;
      }

      if (character === '"') inString = true;
      else if (character === '{') depth += 1;
      else if (character === '}') {
        depth -= 1;
        if (depth === 0) return JSON.parse(cleaned.slice(start, index + 1));
      }
    }

    throw new Error('Response was not valid JSON.');
  }
}

/**
 * Calls the model, strips accidental markdown fences, parses JSON, and
 * validates against `schema`. On failure it retries once with the parse
 * error fed back to the model so it can repair its own output (requirement
 * #15: "attempt controlled retry, repair/re-parse if safe, graceful error").
 * It never throws raw model/DB errors up to the caller — always a
 * StructuredGenerationError with a safe, human-readable message.
 */
export async function generateStructured<T extends z.ZodTypeAny>(
  model: ChatModelLike,
  schema: T,
  messages: BaseMessageLike[]
): Promise<z.infer<T>> {
  let lastError: string | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    const attemptMessages: BaseMessageLike[] =
      attempt === 0
        ? messages
        : [
            ...messages,
            [
              'user',
              `Your previous response failed validation with this error: ${lastError}. Return ONLY the corrected JSON object, no other text.`,
            ] as BaseMessageLike,
          ];

    let raw: string;
    try {
      const response = await model.invoke(attemptMessages, { timeout: 90_000, json: true });
      raw = responseText(response.content);
    } catch (err) {
      // Every provider is down: a second immediate attempt cannot help, and the
      // caller needs to tell "AI is busy" apart from "output was invalid".
      if (err instanceof AllProvidersFailedError) throw err;
      lastError = err instanceof Error ? err.message : 'Unknown model error';
      continue;
    }

    let parsedJson: unknown;
    try {
      parsedJson = parseJsonObject(raw);
    } catch {
      lastError = 'Response was not valid JSON.';
      continue;
    }

    const result = schema.safeParse(parsedJson);
    if (result.success) {
      return result.data;
    }

    lastError = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  }

  throw new StructuredGenerationError(
    'The AI produced output we could not validate after a retry. Please try again.',
    lastError
  );
}
