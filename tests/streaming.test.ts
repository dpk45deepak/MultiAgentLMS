import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FailoverChatModel, resetProviderCooldowns, type Provider } from '@/lib/ai/fallback-model';
import { groqStream, GroqError, DEFAULT_GROQ_MODEL } from '@/lib/ai/groq';
import { setLlmUsageSink } from '@/lib/ai/usage-hook';

async function collect(gen: AsyncGenerator<string, void, void>): Promise<string[]> {
  const out: string[] = [];
  for await (const chunk of gen) out.push(chunk);
  return out;
}

function streamingProvider(name: string, chunks: string[], failAfter?: number): Provider {
  return {
    name,
    model: `${name}-model`,
    timeoutMs: 1000,
    call: async () => chunks.join(''),
    async *stream() {
      for (let i = 0; i < chunks.length; i++) {
        if (failAfter !== undefined && i === failAfter) throw new Error('stream broke');
        yield chunks[i];
      }
    },
  };
}

beforeEach(() => {
  resetProviderCooldowns();
  setLlmUsageSink(null);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('FailoverChatModel.streamText', () => {
  it('yields chunks from the first provider', async () => {
    const model = new FailoverChatModel([streamingProvider('groq', ['Hel', 'lo'])]);
    expect(await collect(model.streamText([['user', 'hi']]))).toEqual(['Hel', 'lo']);
  });

  it('fails over to the next provider when the first fails BEFORE any text', async () => {
    const failing: Provider = {
      name: 'groq',
      model: 'g',
      timeoutMs: 1000,
      call: async () => '',
      async *stream() {
        throw new Error('429 rate limit');
      },
    };
    const model = new FailoverChatModel([failing, streamingProvider('gemini', ['ok'])]);
    expect(await collect(model.streamText([['user', 'hi']]))).toEqual(['ok']);
  });

  it('does NOT switch provider after text was emitted (would duplicate/garble the answer)', async () => {
    const model = new FailoverChatModel([streamingProvider('groq', ['a', 'b', 'c'], 2), streamingProvider('gemini', ['X'])]);
    const gen = model.streamText([['user', 'hi']]);
    const seen: string[] = [];
    await expect(
      (async () => {
        for await (const c of gen) seen.push(c);
      })()
    ).rejects.toThrow('stream broke');
    expect(seen).toEqual(['a', 'b']);
  });

  it('streams a provider without native streaming as a single chunk', async () => {
    const plain: Provider = { name: 'gemini', model: 'm', timeoutMs: 1000, call: async () => 'whole answer' };
    const model = new FailoverChatModel([plain]);
    expect(await collect(model.streamText([['user', 'hi']]))).toEqual(['whole answer']);
  });

  it('throws the friendly busy error when every provider fails', async () => {
    const bad: Provider = { name: 'groq', model: 'g', timeoutMs: 1000, call: async () => { throw new Error('down'); } };
    const model = new FailoverChatModel([bad]);
    await expect(collect(model.streamText([['user', 'hi']]))).rejects.toThrow('busy');
  });

  it('reports usage once per successful streamed reply', async () => {
    const reports: { provider: string; outputChars: number }[] = [];
    setLlmUsageSink((r) => reports.push(r));
    const model = new FailoverChatModel([streamingProvider('groq', ['abc', 'de'])]);
    await collect(model.streamText([['user', 'hello']]));
    expect(reports).toHaveLength(1);
    expect(reports[0].outputChars).toBe(5);
  });

  it('reports usage for a normal invoke too', async () => {
    const reports: { inputChars: number }[] = [];
    setLlmUsageSink((r) => reports.push(r));
    const model = new FailoverChatModel([streamingProvider('groq', ['x'])]);
    await model.invoke([['user', 'hello there']]);
    expect(reports).toHaveLength(1);
    expect(reports[0].inputChars).toBe(11);
  });
});

function sseResponse(lines: string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      // Split mid-line to exercise buffering across network chunks.
      const text = lines.join('\n') + '\n';
      controller.enqueue(encoder.encode(text.slice(0, 17)));
      controller.enqueue(encoder.encode(text.slice(17)));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

const delta = (content: string) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}`;
const base = { apiKey: 'k', model: DEFAULT_GROQ_MODEL, messages: [{ role: 'user' as const, content: 'hi' }], timeoutMs: 1000 };

describe('groqStream', () => {
  it('parses SSE deltas split across network chunks and stops at [DONE]', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(sseResponse([delta('Hel'), '', delta('lo'), '', 'data: [DONE]', '']));
    expect(await collect(groqStream({ ...base, fetchImpl }))).toEqual(['Hel', 'lo']);
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.stream).toBe(true);
  });

  it('throws a GroqError carrying the HTTP status before yielding anything', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: 'rate limited' } }), { status: 429 }));
    await expect(collect(groqStream({ ...base, fetchImpl }))).rejects.toBeInstanceOf(GroqError);
  });

  it('throws when the stream ends without any text', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(sseResponse(['data: [DONE]']));
    await expect(collect(groqStream({ ...base, fetchImpl }))).rejects.toBeInstanceOf(GroqError);
  });
});
