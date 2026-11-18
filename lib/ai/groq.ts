/**
 * Minimal Groq chat-completions client.
 *
 * Groq exposes an OpenAI-compatible REST API, so we call it with plain
 * `fetch` instead of adding an SDK. That keeps package.json / package-lock.json
 * unchanged and works on Node, Vercel and edge runtimes alike.
 *
 * This file has no imports from the rest of the app on purpose, so it can be
 * unit-tested in isolation.
 */

export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
export const DEFAULT_GROQ_VISION_MODEL = 'qwen/qwen3.8-27b';
export const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface GroqRequest {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Ask Groq for a JSON object (JSON mode). */
  json?: boolean;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}

export class GroqError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'GroqError';
  }
}

/** Per-model output-token ceilings (from Groq's model list). */
function maxCompletionTokens(model: string): number {
  if (model.startsWith('openai/gpt-oss')) return 65_536;
  if (model.startsWith('qwen/')) return 16_384;
  return 8_192;
}

/** Model-family specific knobs so reasoning models answer quickly and cleanly. */
function reasoningParams(model: string): Record<string, unknown> {
  if (model.startsWith('openai/gpt-oss')) {
    return { reasoning_effort: 'low', include_reasoning: false };
  }
  if (model.startsWith('qwen/')) {
    // Instruct (non-thinking) mode: fastest, and no <think> tokens eat the budget.
    return { reasoning_effort: 'none' };
  }
  return {};
}

/** Reasoning models spend part of max_completion_tokens on hidden reasoning. */
function tokenBudget(model: string, requested: number | undefined): number | undefined {
  if (!requested) return undefined;
  const headroom = model.startsWith('openai/gpt-oss') ? 2048 : 0;
  return Math.min(requested + headroom, maxCompletionTokens(model));
}

/** Some reasoning models wrap chain-of-thought in <think> tags. Never show it. */
export function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

async function post(body: Record<string, unknown>, req: GroqRequest): Promise<Response> {
  const doFetch = req.fetchImpl ?? fetch;
  try {
    return await doFetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${req.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(req.timeoutMs),
    });
  } catch (err) {
    if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      throw new GroqError(`Groq request timed out after ${req.timeoutMs}ms`, 408);
    }
    throw new GroqError(err instanceof Error ? err.message : 'Groq network error');
  }
}

/**
 * Calls Groq and returns the assistant text.
 *
 * If Groq rejects the optional parameters (JSON mode, reasoning knobs — these
 * differ per model and change over time) with HTTP 400, we retry once with a
 * plain request so a parameter quirk never turns into a user-visible failure.
 */
export async function groqComplete(req: GroqRequest): Promise<string> {
  const base: Record<string, unknown> = {
    model: req.model,
    messages: req.messages,
    temperature: req.temperature ?? 0.3,
    stream: false,
  };
  const budget = tokenBudget(req.model, req.maxTokens);
  if (budget) base.max_completion_tokens = budget;

  const enhanced: Record<string, unknown> = { ...base, ...reasoningParams(req.model) };
  if (req.json) enhanced.response_format = { type: 'json_object' };

  let response = await post(enhanced, req);

  if (response.status === 400 && (req.json || Object.keys(reasoningParams(req.model)).length > 0)) {
    response = await post(base, req);
  }

  if (!response.ok) {
    let detail = '';
    try {
      const errBody = (await response.json()) as { error?: { message?: string } };
      detail = errBody?.error?.message ?? '';
    } catch {
      /* body was not JSON */
    }
    throw new GroqError(`Groq API error ${response.status}${detail ? `: ${detail}` : ''}`, response.status);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  const text = stripThinking(data.choices?.[0]?.message?.content ?? '');
  if (!text) throw new GroqError('Groq returned an empty response');
  return text;
}

/**
 * Streams the assistant text as it is generated (OpenAI-style SSE). Yields
 * non-empty text deltas. Like `groqComplete`, a 400 on the optional reasoning
 * parameters is retried once with a plain request. Throws GroqError before the
 * first yield if the request itself fails, so callers can fail over cleanly.
 */
export async function* groqStream(req: GroqRequest): AsyncGenerator<string, void, void> {
  const base: Record<string, unknown> = {
    model: req.model,
    messages: req.messages,
    temperature: req.temperature ?? 0.3,
    stream: true,
  };
  const budget = tokenBudget(req.model, req.maxTokens);
  if (budget) base.max_completion_tokens = budget;

  const enhanced: Record<string, unknown> = { ...base, ...reasoningParams(req.model) };

  let response = await post(enhanced, req);
  if (response.status === 400 && Object.keys(reasoningParams(req.model)).length > 0) {
    response = await post(base, req);
  }

  if (!response.ok || !response.body) {
    let detail = '';
    try {
      const errBody = (await response.json()) as { error?: { message?: string } };
      detail = errBody?.error?.message ?? '';
    } catch {
      /* body was not JSON */
    }
    throw new GroqError(`Groq API error ${response.status}${detail ? `: ${detail}` : ''}`, response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let yielded = false;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newline: number;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') {
          if (!yielded) throw new GroqError('Groq returned an empty response');
          return;
        }
        try {
          const json = JSON.parse(payload) as { choices?: { delta?: { content?: string | null } }[] };
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            yielded = true;
            yield delta;
          }
        } catch {
          /* ignore keep-alive / malformed lines */
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!yielded) throw new GroqError('Groq returned an empty response');
}
