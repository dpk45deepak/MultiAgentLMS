import { describe, it, expect, vi } from 'vitest';
import { groqComplete, GroqError, stripThinking, DEFAULT_GROQ_MODEL } from '@/lib/ai/groq';

function ok(content: string) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
}

function fail(status: number, message: string) {
  return new Response(JSON.stringify({ error: { message } }), { status });
}

const base = {
  apiKey: 'test-key',
  model: DEFAULT_GROQ_MODEL,
  messages: [{ role: 'user' as const, content: 'hi' }],
  timeoutMs: 1000,
};

describe('groqComplete', () => {
  it('sends the bearer key, model, JSON mode and a padded token budget', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok('{"a":1}'));

    const text = await groqComplete({ ...base, json: true, maxTokens: 1000, fetchImpl });

    expect(text).toBe('{"a":1}');
    const [, init] = fetchImpl.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer test-key');
    const body = JSON.parse(init.body);
    expect(body.model).toBe(DEFAULT_GROQ_MODEL);
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.max_completion_tokens).toBeGreaterThan(1000);
  });

  it('retries once without optional parameters when Groq answers 400', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(fail(400, 'unsupported parameter'))
      .mockResolvedValueOnce(ok('plain answer'));

    const text = await groqComplete({ ...base, json: true, fetchImpl });

    expect(text).toBe('plain answer');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const retryBody = JSON.parse(fetchImpl.mock.calls[1][1].body);
    expect(retryBody.response_format).toBeUndefined();
    expect(retryBody.reasoning_effort).toBeUndefined();
  });

  it('throws a GroqError carrying the HTTP status', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fail(429, 'rate limit reached'));

    const error = await groqComplete({ ...base, fetchImpl }).catch((e) => e);

    expect(error).toBeInstanceOf(GroqError);
    expect(error.status).toBe(429);
    expect(error.message).toContain('rate limit reached');
  });

  it('throws on an empty completion', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok('  '));
    await expect(groqComplete({ ...base, fetchImpl })).rejects.toBeInstanceOf(GroqError);
  });
});

describe('stripThinking', () => {
  it('removes <think> blocks', () => {
    expect(stripThinking('<think>secret plan</think>\n{"ok":true}')).toBe('{"ok":true}');
  });
});
