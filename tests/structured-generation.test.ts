import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { generateStructured, StructuredGenerationError } from '@/lib/ai/structured';
import type { ChatModelLike } from '@/lib/ai/fallback-model';

const schema = z.object({ ok: z.boolean() });

function fakeModel(responses: string[]) {
  let call = 0;
  return {
    invoke: vi.fn().mockImplementation(async () => {
      const content = responses[Math.min(call, responses.length - 1)];
      call += 1;
      return { content };
    }),
  } as unknown as ChatModelLike;
}

describe('generateStructured', () => {
  it('parses a clean JSON response on the first try', async () => {
    const model = fakeModel(['{"ok": true}']);
    const result = await generateStructured(model, schema, [['user', 'hi']]);
    expect(result).toEqual({ ok: true });
  });

  it('strips markdown code fences before parsing', async () => {
    const model = fakeModel(['```json\n{"ok": true}\n```']);
    const result = await generateStructured(model, schema, [['user', 'hi']]);
    expect(result).toEqual({ ok: true });
  });

  it('extracts JSON when the model adds surrounding prose', async () => {
    const model = fakeModel(['Here is the requested JSON:\n{"ok": true}\nHope this helps.']);
    const result = await generateStructured(model, schema, [['user', 'hi']]);
    expect(result).toEqual({ ok: true });
  });

  it('retries once when the first response fails validation, then succeeds', async () => {
    const model = fakeModel(['{"ok": "not a boolean"}', '{"ok": true}']);
    const result = await generateStructured(model, schema, [['user', 'hi']]);
    expect(result).toEqual({ ok: true });
    expect((model.invoke as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(2);
  });

  it('throws a StructuredGenerationError after a failed retry', async () => {
    const model = fakeModel(['not json at all', 'still not json']);
    await expect(generateStructured(model, schema, [['user', 'hi']])).rejects.toBeInstanceOf(
      StructuredGenerationError
    );
  });

  it('parses JSON text returned as multimodal content blocks', async () => {
    const model = {
      invoke: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ answer: 'ok' }) }],
      }),
    } as never;

    const result = await generateStructured(model, z.object({ answer: z.string() }), []);

    expect(result).toEqual({ answer: 'ok' });
  });

  it('parses JSON text returned as a single content object', async () => {
    const model = {
      invoke: vi.fn().mockResolvedValue({ content: { text: '{"answer":"ok"}' } }),
    } as never;

    const result = await generateStructured(model, z.object({ answer: z.string() }), []);

    expect(result).toEqual({ answer: 'ok' });
  });
});
