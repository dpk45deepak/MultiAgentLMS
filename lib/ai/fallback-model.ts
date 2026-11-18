import type { BaseMessageLike } from '@langchain/core/messages';
import { groqComplete, groqStream, type ChatMessage, type ContentPart } from './groq';
import { responseText } from './response-text';
import { AI_BUSY_MESSAGE } from './errors';
import { countInputChars, emitLlmUsage } from './usage-hook';

/**
 * Provider failover.
 *
 * `FailoverChatModel` exposes the same `.invoke(messages, options)` surface
 * the agents already use, but internally tries providers in order (Groq
 * first, then Gemini as fallback). The first provider that returns non-empty text wins, so
 * users never see an outage, quota error, timeout or empty response —
 * they just get an answer a moment later.
 *
 * A short per-provider "cooldown" remembers recent hard failures (429 quota,
 * bad key, 5xx, timeout) so the next requests skip the broken provider
 * instead of making every user wait for it to fail again.
 */


export interface InvokeOptions {
  timeout?: number;
  /** Caller expects a JSON object back (enables JSON mode on providers that support it). */
  json?: boolean;
}

export interface ChatModelLike {
  invoke(messages: BaseMessageLike[], options?: InvokeOptions): Promise<{ content: unknown }>;
  /** Optional token streaming (LangChain chat models expose this). */
  stream?(messages: BaseMessageLike[], options?: InvokeOptions): Promise<AsyncIterable<{ content: unknown }>>;
  /** Optional provider-agnostic text streaming (implemented by FailoverChatModel). */
  streamText?(messages: BaseMessageLike[], options?: InvokeOptions): AsyncGenerator<string, void, void>;
}

export interface FailoverResult {
  content: string;
  provider: string;
  model: string;
}

export interface Provider {
  /** Short label used in logs, e.g. "gemini" or "groq". */
  name: string;
  model: string;
  /** Hard cap for one call to this provider. */
  timeoutMs: number;
  call(messages: BaseMessageLike[], options: InvokeOptions & { timeoutMs: number }): Promise<string>;
  /** Optional: yield the answer incrementally. Providers without it are streamed as one chunk. */
  stream?(messages: BaseMessageLike[], options: InvokeOptions & { timeoutMs: number }): AsyncGenerator<string, void, void>;
}

export class AllProvidersFailedError extends Error {
  constructor(
    message: string,
    public readonly failures: { provider: string; message: string }[]
  ) {
    super(message);
    this.name = 'AllProvidersFailedError';
  }
}

const cooldownUntil = new Map<string, number>();

/** Test helper. */
export function resetProviderCooldowns() {
  cooldownUntil.clear();
}

export function errorStatus(err: unknown): number | undefined {
  if (err && typeof err === 'object') {
    const e = err as { status?: unknown; statusCode?: unknown; response?: { status?: unknown } };
    for (const candidate of [e.status, e.statusCode, e.response?.status]) {
      if (typeof candidate === 'number') return candidate;
    }
  }
  const message = err instanceof Error ? err.message : String(err);
  const bracketed = message.match(/\[(\d{3})[\s\]]/);
  if (bracketed) return Number(bracketed[1]);
  const bare = message.match(/\b(401|403|404|408|429|500|502|503|504)\b/);
  return bare ? Number(bare[1]) : undefined;
}

/** Failures that will likely repeat on the very next request. */
function shouldCoolDown(err: unknown): boolean {
  const status = errorStatus(err);
  if (status !== undefined) return status === 401 || status === 403 || status === 404 || status === 408 || status === 429 || status >= 500;
  const message = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return /timed? ?out|timeout|fetch failed|network|econn|enotfound|quota|rate limit|overloaded/.test(message);
}

function safeReason(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  // Never let anything that looks like a key reach logs.
  return raw.replace(/(key=|Bearer\s+)[A-Za-z0-9_\-]+/gi, '$1***').slice(0, 300);
}

export class FailoverChatModel implements ChatModelLike {
  constructor(
    private readonly providers: Provider[],
    private readonly cooldownMs: number = 60_000,
    private readonly now: () => number = Date.now
  ) {
    if (providers.length === 0) {
      throw new Error('No AI provider is configured. Set GEMINI_API_KEY and/or GROQ_API_KEY — see .env.example.');
    }
  }

  async invoke(messages: BaseMessageLike[], options?: InvokeOptions): Promise<FailoverResult> {
    const key = (p: Provider) => `${p.name}:${p.model}`;
    const ready = this.providers.filter((p) => (cooldownUntil.get(key(p)) ?? 0) <= this.now());
    // If every provider is cooling down, still try them all rather than fail outright.
    const order = ready.length > 0 ? ready : this.providers;

    const failures: { provider: string; message: string }[] = [];

    for (const provider of order) {
      const timeoutMs = Math.min(options?.timeout ?? provider.timeoutMs, provider.timeoutMs);
      try {
        const text = (await provider.call(messages, { ...options, timeoutMs })).trim();
        if (!text) throw new Error('empty response');
        cooldownUntil.delete(key(provider));
        emitLlmUsage({
          provider: provider.name,
          model: provider.model,
          inputChars: countInputChars(messages),
          outputChars: text.length,
        });
        return { content: text, provider: provider.name, model: provider.model };
      } catch (err) {
        const reason = safeReason(err);
        failures.push({ provider: provider.name, message: reason });
        if (this.cooldownMs > 0 && shouldCoolDown(err)) {
          cooldownUntil.set(key(provider), this.now() + this.cooldownMs);
        }
        const next = order[order.indexOf(provider) + 1];
        if (next) {
          console.warn(`[ai] ${provider.name} failed (${reason}); falling back to ${next.name}.`);
        } else {
          console.error(`[ai] ${provider.name} failed (${reason}); no more providers to try.`);
        }
      }
    }

    throw new AllProvidersFailedError(AI_BUSY_MESSAGE, failures);
  }

  /**
   * Streams the reply. Providers are tried in the same order as `invoke`; if a
   * provider fails BEFORE producing its first chunk we fail over to the next
   * one. Once text has been emitted we cannot switch providers mid-answer, so
   * a later failure is rethrown to the caller.
   */
  async *streamText(messages: BaseMessageLike[], options?: InvokeOptions): AsyncGenerator<string, void, void> {
    const key = (p: Provider) => `${p.name}:${p.model}`;
    const ready = this.providers.filter((p) => (cooldownUntil.get(key(p)) ?? 0) <= this.now());
    const order = ready.length > 0 ? ready : this.providers;
    const failures: { provider: string; message: string }[] = [];

    for (const provider of order) {
      const timeoutMs = Math.min(options?.timeout ?? provider.timeoutMs, provider.timeoutMs);
      let emitted = false;
      let outputChars = 0;
      try {
        if (provider.stream) {
          for await (const chunk of provider.stream(messages, { ...options, timeoutMs })) {
            if (!chunk) continue;
            emitted = true;
            outputChars += chunk.length;
            yield chunk;
          }
        } else {
          const text = (await provider.call(messages, { ...options, timeoutMs })).trim();
          if (text) {
            emitted = true;
            outputChars += text.length;
            yield text;
          }
        }
        if (!emitted) throw new Error('empty response');
        cooldownUntil.delete(key(provider));
        emitLlmUsage({
          provider: provider.name,
          model: provider.model,
          inputChars: countInputChars(messages),
          outputChars,
        });
        return;
      } catch (err) {
        if (emitted) throw err;
        const reason = safeReason(err);
        failures.push({ provider: provider.name, message: reason });
        if (this.cooldownMs > 0 && shouldCoolDown(err)) {
          cooldownUntil.set(key(provider), this.now() + this.cooldownMs);
        }
        console.warn(`[ai] ${provider.name} stream failed (${reason}).`);
      }
    }

    throw new AllProvidersFailedError(AI_BUSY_MESSAGE, failures);
  }
}

/* ------------------------------------------------------------------ */
/* Provider builders                                                   */
/* ------------------------------------------------------------------ */

export function geminiProvider(
  client: ChatModelLike,
  model: string,
  timeoutMs: number
): Provider {
  return {
    name: 'gemini',
    model,
    timeoutMs,
    async call(messages, options) {
      const response = await client.invoke(messages, { timeout: options.timeoutMs });
      return responseText(response.content);
    },
    async *stream(messages, options) {
      if (!client.stream) {
        yield responseText((await client.invoke(messages, { timeout: options.timeoutMs })).content);
        return;
      }
      const chunks = await client.stream(messages, { timeout: options.timeoutMs });
      for await (const chunk of chunks) {
        const text = responseText(chunk.content);
        if (text) yield text;
      }
    },
  };
}

interface GroqProviderConfig {
  apiKey: string;
  textModel: string;
  visionModel: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}

const ROLE_MAP: Record<string, ChatMessage['role']> = {
  system: 'system',
  user: 'user',
  human: 'user',
  assistant: 'assistant',
  ai: 'assistant',
};

interface LoosePart {
  type?: string;
  text?: string;
  mimeType?: string;
  mime_type?: string;
  data?: string;
  image_url?: string | { url?: string };
}

function toParts(content: unknown): ContentPart[] {
  if (typeof content === 'string') return [{ type: 'text', text: content }];
  if (!Array.isArray(content)) return [{ type: 'text', text: responseText(content) }];

  const parts: ContentPart[] = [];
  for (const raw of content as (string | LoosePart)[]) {
    if (typeof raw === 'string') {
      parts.push({ type: 'text', text: raw });
    } else if (raw.type === 'media' || (raw.type === 'image' && raw.data)) {
      const mime = raw.mimeType ?? raw.mime_type ?? 'image/png';
      parts.push({ type: 'image_url', image_url: { url: `data:${mime};base64,${raw.data}` } });
    } else if (raw.type === 'image_url' && raw.image_url) {
      const url = typeof raw.image_url === 'string' ? raw.image_url : raw.image_url.url;
      if (url) parts.push({ type: 'image_url', image_url: { url } });
    } else if (typeof raw.text === 'string') {
      parts.push({ type: 'text', text: raw.text });
    }
  }
  return parts;
}

/** Converts LangChain-style messages (tuples or message objects) to Groq/OpenAI chat messages. */
export function toGroqMessages(messages: BaseMessageLike[]): { messages: ChatMessage[]; hasImage: boolean } {
  let hasImage = false;

  const out = messages.map((m): ChatMessage => {
    let role: string;
    let content: unknown;

    if (Array.isArray(m)) {
      role = String(m[0]);
      content = m[1];
    } else if (typeof m === 'string') {
      role = 'user';
      content = m;
    } else {
      const obj = m as unknown as { role?: string; _getType?: () => string; getType?: () => string; content?: unknown };
      role = obj.role ?? obj._getType?.() ?? obj.getType?.() ?? 'user';
      content = obj.content;
    }

    const parts = toParts(content);
    const image = parts.some((p) => p.type === 'image_url');
    if (image) hasImage = true;

    return {
      role: ROLE_MAP[role] ?? 'user',
      // Plain string when text-only — the widest-compatible shape.
      content: image ? parts : parts.map((p) => (p.type === 'text' ? p.text : '')).join(''),
    };
  });

  return { messages: out, hasImage };
}

export function groqProvider(config: GroqProviderConfig): Provider {
  return {
    name: 'groq',
    model: config.textModel,
    timeoutMs: config.timeoutMs,
    async call(messages, options) {
      const { messages: groqMessages, hasImage } = toGroqMessages(messages);
      return groqComplete({
        apiKey: config.apiKey,
        model: hasImage ? config.visionModel : config.textModel,
        messages: groqMessages,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        json: options.json,
        timeoutMs: options.timeoutMs,
        fetchImpl: config.fetchImpl,
      });
    },
    async *stream(messages, options) {
      const { messages: groqMessages, hasImage } = toGroqMessages(messages);
      yield* groqStream({
        apiKey: config.apiKey,
        model: hasImage ? config.visionModel : config.textModel,
        messages: groqMessages,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        timeoutMs: options.timeoutMs,
        fetchImpl: config.fetchImpl,
      });
    },
  };
}
