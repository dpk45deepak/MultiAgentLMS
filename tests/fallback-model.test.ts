import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  FailoverChatModel,
  AllProvidersFailedError,
  resetProviderCooldowns,
  toGroqMessages,
  errorStatus,
  type Provider,
} from '@/lib/ai/fallback-model';

function provider(name: string, call: Provider['call']): Provider {
  return { name, model: `${name}-model`, timeoutMs: 1000, call };
}

beforeEach(() => {
  resetProviderCooldowns();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('FailoverChatModel', () => {
  it('uses Groq as primary provider when it succeeds and never touches Gemini', async () => {
    const groq = vi.fn().mockResolvedValue('from groq');
    const gemini = vi.fn().mockResolvedValue('from gemini');
    const model = new FailoverChatModel([provider('groq', groq), provider('gemini', gemini)]);

    const result = await model.invoke([['user', 'hi']]);

    expect(result.content).toBe('from groq');
    expect(result.provider).toBe('groq');
    expect(gemini).not.toHaveBeenCalled();
  });

  it('falls back to Gemini when Groq throws', async () => {
    const groq = vi.fn().mockRejectedValue(new Error('Groq API error 429: rate limit reached'));
    const gemini = vi.fn().mockResolvedValue('from gemini');
    const model = new FailoverChatModel([provider('groq', groq), provider('gemini', gemini)]);

    const result = await model.invoke([['user', 'hi']]);

    expect(result.content).toBe('from gemini');
    expect(result.provider).toBe('gemini');
    expect(groq).toHaveBeenCalledTimes(1);
    expect(gemini).toHaveBeenCalledTimes(1);
  });

  it('falls back to Gemini when Groq returns an empty response', async () => {
    const groq = vi.fn().mockResolvedValue('   ');
    const gemini = vi.fn().mockResolvedValue('from gemini');
    const model = new FailoverChatModel([provider('groq', groq), provider('gemini', gemini)]);

    const result = await model.invoke([['user', 'hi']]);

    expect(result.content).toBe('from gemini');
    expect(result.provider).toBe('gemini');
    expect(groq).toHaveBeenCalledTimes(1);
    expect(gemini).toHaveBeenCalledTimes(1);
  });

  it('uses the primary provider when it succeeds and never touches the fallback', async () => {
    const primary = vi.fn().mockResolvedValue('from primary');
    const fallback = vi.fn().mockResolvedValue('from fallback');
    const model = new FailoverChatModel([provider('primary', primary), provider('fallback', fallback)]);

    const result = await model.invoke([['user', 'hi']]);

    expect(result.content).toBe('from primary');
    expect(result.provider).toBe('primary');
    expect(fallback).not.toHaveBeenCalled();
  });

  it('falls back to Groq when Gemini throws', async () => {
    const gemini = vi.fn().mockRejectedValue(new Error('[503 Service Unavailable] The model is overloaded'));
    const groq = vi.fn().mockResolvedValue('from groq');
    const model = new FailoverChatModel([provider('gemini', gemini), provider('groq', groq)]);

    const result = await model.invoke([['user', 'hi']]);

    expect(result.content).toBe('from groq');
    expect(result.provider).toBe('groq');
    expect(gemini).toHaveBeenCalledTimes(1);
    expect(groq).toHaveBeenCalledTimes(1);
  });

  it('falls back to Groq when Gemini returns an empty response', async () => {
    const gemini = vi.fn().mockResolvedValue('   ');
    const groq = vi.fn().mockResolvedValue('from groq');
    const model = new FailoverChatModel([provider('gemini', gemini), provider('groq', groq)]);

    const result = await model.invoke([['user', 'hi']]);

    expect(result.provider).toBe('groq');
  });

  it('skips a provider that just failed with a quota error (cooldown), then retries it after the cooldown', async () => {
    let clock = 1_000_000;
    const gemini = vi.fn().mockRejectedValue(new Error('[429 Too Many Requests] quota exceeded'));
    const groq = vi.fn().mockResolvedValue('from groq');
    const model = new FailoverChatModel(
      [provider('gemini', gemini), provider('groq', groq)],
      60_000,
      () => clock
    );

    await model.invoke([['user', 'one']]);
    await model.invoke([['user', 'two']]);
    expect(gemini).toHaveBeenCalledTimes(1); // second request skipped Gemini entirely
    expect(groq).toHaveBeenCalledTimes(2);

    clock += 61_000;
    await model.invoke([['user', 'three']]);
    expect(gemini).toHaveBeenCalledTimes(2); // cooldown expired, Gemini is tried again
  });

  it('does not put a provider on cooldown for a request-specific error', async () => {
    const gemini = vi.fn().mockRejectedValue(new Error('Response blocked by safety settings'));
    const groq = vi.fn().mockResolvedValue('from groq');
    const model = new FailoverChatModel([provider('gemini', gemini), provider('groq', groq)]);

    await model.invoke([['user', 'one']]);
    await model.invoke([['user', 'two']]);

    expect(gemini).toHaveBeenCalledTimes(2);
  });

  it('throws a friendly AllProvidersFailedError and does not leak keys when every provider fails', async () => {
    const gemini = vi.fn().mockRejectedValue(new Error('bad request ?key=AIzaSECRET123'));
    const groq = vi.fn().mockRejectedValue(new Error('Groq API error 500'));
    const model = new FailoverChatModel([provider('gemini', gemini), provider('groq', groq)]);

    const error = await model.invoke([['user', 'hi']]).catch((e) => e);

    expect(error).toBeInstanceOf(AllProvidersFailedError);
    expect(error.message).toContain('try again');
    expect(JSON.stringify(error.failures)).not.toContain('AIzaSECRET123');
  });

  it('still tries providers when all of them are cooling down', async () => {
    const gemini = vi.fn().mockRejectedValue(new Error('[429 Too Many Requests]'));
    const groq = vi.fn().mockRejectedValueOnce(new Error('Groq API error 429')).mockResolvedValue('recovered');
    const model = new FailoverChatModel([provider('gemini', gemini), provider('groq', groq)]);

    await model.invoke([['user', 'a']]).catch(() => {});
    const result = await model.invoke([['user', 'b']]);

    expect(result.content).toBe('recovered');
  });

  it('rejects construction with no providers', () => {
    expect(() => new FailoverChatModel([])).toThrow();
  });
});

describe('errorStatus', () => {
  it('reads status from the error object or the message', () => {
    expect(errorStatus({ status: 429 })).toBe(429);
    expect(errorStatus(new Error('[GoogleGenerativeAI Error]: [503 Service Unavailable] overloaded'))).toBe(503);
    expect(errorStatus(new Error('something odd'))).toBeUndefined();
  });
});

describe('toGroqMessages', () => {
  it('maps roles and keeps plain text as a string', () => {
    const { messages, hasImage } = toGroqMessages([
      ['system', 'be brief'],
      ['human', 'hello'],
      ['ai', 'hi there'],
    ]);

    expect(hasImage).toBe(false);
    expect(messages).toEqual([
      { role: 'system', content: 'be brief' },
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi there' },
    ]);
  });

  it('converts Gemini-style media parts into OpenAI-style image_url parts', () => {
    const { messages, hasImage } = toGroqMessages([
      [
        'user',
        [
          { type: 'text', text: 'read this' },
          { type: 'media', mimeType: 'image/png', data: 'AAAA' },
        ],
      ],
    ]);

    expect(hasImage).toBe(true);
    expect(messages[0].content).toEqual([
      { type: 'text', text: 'read this' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } },
    ]);
  });
});
