/**
 * Dependency-free seam between the AI layer and usage metering: the failover
 * model reports every successful LLM call here, and lib/usage registers the
 * sink that persists it. Keeping it separate avoids an import cycle and keeps
 * the AI layer free of database code.
 */
export interface LlmCallReport {
  provider: string;
  model: string;
  /** Approximate input characters (media parts are counted as a flat size). */
  inputChars: number;
  outputChars: number;
}

type Sink = (report: LlmCallReport) => void;
let sink: Sink | null = null;

export function setLlmUsageSink(next: Sink | null) {
  sink = next;
}

export function emitLlmUsage(report: LlmCallReport) {
  if (!sink) return;
  try {
    sink(report);
  } catch {
    /* metering must never break an AI call */
  }
}

/** Counts text characters in LangChain-style message tuples; images/media count as a flat 4000 chars (~1000 tokens). */
export function countInputChars(messages: unknown[]): number {
  let total = 0;
  for (const message of messages) {
    const content = Array.isArray(message) ? message[1] : (message as { content?: unknown })?.content;
    if (typeof content === 'string') total += content.length;
    else if (Array.isArray(content)) {
      for (const part of content as { type?: string; text?: string }[]) {
        if (part?.type === 'text' && typeof part.text === 'string') total += part.text.length;
        else total += 4000;
      }
    }
  }
  return total;
}
