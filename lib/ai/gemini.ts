import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import {
  FailoverChatModel,
  geminiProvider,
  groqProvider,
  type ChatModelLike,
  type Provider,
} from '@/lib/ai/fallback-model';
import { DEFAULT_GROQ_MODEL, DEFAULT_GROQ_VISION_MODEL } from '@/lib/ai/groq';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';

/**
 * Every agent gets its model from here rather than constructing its own
 * client. That gives us one place to:
 *  - swap models / providers,
 *  - cap output tokens (cost control, requirement #33),
 *  - keep the API keys server-side only (this file is never imported from
 *    a "use client" component).
 *
 * Provider order: Groq first (primary), Gemini as automatic fallback. If Groq
 * errors for ANY reason (quota, outage, bad key, timeout, empty answer) the
 * same request is transparently replayed on Gemini, so the user just gets an
 * answer. Either key may be omitted: with only GROQ_API_KEY the app runs on
 * Groq alone, with only GEMINI_API_KEY it runs on Gemini alone.
 *
 * The file keeps its original name so existing imports and test mocks of
 * '@/lib/ai/gemini' keep working.
 */

if (typeof window !== 'undefined') {
  throw new Error(
    'lib/ai/gemini.ts must never be imported into client-side code — it requires AI provider API keys.'
  );
}

interface ModelOptions {
  temperature?: number;
  maxOutputTokens?: number;
}

function envNumber(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getGeminiModelName(): string {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

export function getGroqModelName(): string {
  return process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
}

/** Human-readable description of the configured chain, e.g. for the `notes.model` column. */
export function describeModelChain(): string {
  const chain: string[] = [];
  if (process.env.GROQ_API_KEY) chain.push(`groq:${getGroqModelName()}`);
  if (process.env.GEMINI_API_KEY) chain.push(getGeminiModelName());
  return chain.length > 0 ? chain.join(' -> ') : `groq:${getGroqModelName()}`;
}

function buildProviders(options?: ModelOptions): Provider[] {
  const temperature = options?.temperature ?? 0.3;
  const maxOutputTokens = options?.maxOutputTokens ?? 4096;
  const providers: Provider[] = [];

  // 1. Primary: Groq (ultra-fast inference)
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    providers.push(
      groqProvider({
        apiKey: groqKey,
        textModel: getGroqModelName(),
        visionModel: process.env.GROQ_VISION_MODEL || DEFAULT_GROQ_VISION_MODEL,
        temperature,
        maxTokens: maxOutputTokens,
        timeoutMs: envNumber('GROQ_TIMEOUT_MS', 60_000),
      })
    );
  }

  // 2. Fallback: Google Gemini
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const model = getGeminiModelName();
    const client = new ChatGoogleGenerativeAI({
      apiKey: geminiKey,
      model,
      maxRetries: 0,
      temperature,
      maxOutputTokens,
    });
    providers.push(geminiProvider(client as unknown as ChatModelLike, model, envNumber('GEMINI_TIMEOUT_MS', 40_000)));
  }

  return providers;
}


export function getStructuredModel(options?: ModelOptions): ChatModelLike {
  const providers = buildProviders(options);

  if (providers.length === 0) {
    throw new Error(
      'No AI provider is configured. Set GEMINI_API_KEY and/or GROQ_API_KEY in .env.local — see .env.example.'
    );
  }

  return new FailoverChatModel(providers, envNumber('AI_PROVIDER_COOLDOWN_SECONDS', 60) * 1000);
}

/**
 * Same failover chain, used for multimodal (image) input. Gemini reads inline
 * image parts natively; when Groq is the one answering, the request is routed
 * to GROQ_VISION_MODEL automatically. Kept as a separate named export so call
 * sites read clearly and there is one seam to swap in a dedicated vision model.
 */
export function getVisionModel(options?: ModelOptions): ChatModelLike {
  return getStructuredModel(options);
}
