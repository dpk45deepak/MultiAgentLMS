import { describe, it, expect } from 'vitest';
import {
  AssessmentSubmitBodySchema,
  TutorChatBodySchema,
  ManualTopicBodySchema,
  NotesGenerateBodySchema,
  AssessmentGenerateBodySchema,
  PinnedItemBodySchema,
  LIMITS,
  parseJsonBody,
} from '@/lib/validation/api';

const UUID = '3b241101-e2bb-4255-8caf-4136c566a962';
const req = (body: string) => new Request('http://localhost/api', { method: 'POST', body });

describe('API body schemas', () => {
  it('caps tutor messages at 4000 chars and requires a session or topic', () => {
    expect(TutorChatBodySchema.safeParse({ topicId: UUID, message: 'hi' }).success).toBe(true);
    expect(TutorChatBodySchema.safeParse({ sessionId: UUID, message: 'x'.repeat(4000) }).success).toBe(true);
    expect(TutorChatBodySchema.safeParse({ sessionId: UUID, message: 'x'.repeat(4001) }).success).toBe(false);
    expect(TutorChatBodySchema.safeParse({ message: 'hi' }).success).toBe(false);
    expect(TutorChatBodySchema.safeParse({ topicId: UUID, message: '   ' }).success).toBe(false);
  });

  it('caps each short answer at 2000 chars and the answers array length', () => {
    const answer = (n: number) => ({ questionId: UUID, answer: 'a'.repeat(n) });
    expect(AssessmentSubmitBodySchema.safeParse({ answers: [answer(2000)] }).success).toBe(true);
    expect(AssessmentSubmitBodySchema.safeParse({ answers: [answer(2001)] }).success).toBe(false);
    expect(AssessmentSubmitBodySchema.safeParse({ answers: [] }).success).toBe(false);
    expect(
      AssessmentSubmitBodySchema.safeParse({ answers: Array.from({ length: LIMITS.maxAnswers + 1 }, () => answer(1)) }).success
    ).toBe(false);
  });

  it('caps subject and topic names at 120 chars', () => {
    expect(ManualTopicBodySchema.safeParse({ subject: 'OS', topic: 'Deadlocks' }).success).toBe(true);
    expect(ManualTopicBodySchema.safeParse({ subject: 'x'.repeat(121), topic: 'a' }).success).toBe(false);
    expect(ManualTopicBodySchema.safeParse({ subject: 'a', topic: 'x'.repeat(121) }).success).toBe(false);
    expect(ManualTopicBodySchema.safeParse({ subject: '  ', topic: 'a' }).success).toBe(false);
  });

  it('validates ids and defaults', () => {
    expect(NotesGenerateBodySchema.safeParse({ topicId: 'nope' }).success).toBe(false);
    const parsed = AssessmentGenerateBodySchema.parse({ topicId: UUID });
    expect(parsed.difficulty).toBe('adaptive');
    expect(parsed.includeShortAnswer).toBe(true);
  });

  it('only allows same-site paths for pinned item links', () => {
    const base = { itemKey: 'k', title: 't', type: 'notes' };
    expect(PinnedItemBodySchema.safeParse({ ...base, href: '/learn/1' }).success).toBe(true);
    expect(PinnedItemBodySchema.safeParse({ ...base, href: 'https://evil.com' }).success).toBe(false);
    expect(PinnedItemBodySchema.safeParse({ ...base, href: '//evil.com' }).success).toBe(false);
  });
});

describe('parseJsonBody', () => {
  it('returns parsed data for a valid body', async () => {
    const result = await parseJsonBody(req(JSON.stringify({ subject: 'OS', topic: 'Deadlocks' })), ManualTopicBodySchema);
    expect(result.ok).toBe(true);
  });

  it('returns 400 for malformed JSON and schema violations', async () => {
    const bad = await parseJsonBody(req('{not json'), ManualTopicBodySchema);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.response.status).toBe(400);

    const invalid = await parseJsonBody(req(JSON.stringify({ subject: 'x'.repeat(200), topic: 'a' })), ManualTopicBodySchema);
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.response.status).toBe(400);
  });

  it('returns 413 for oversized bodies', async () => {
    const huge = await parseJsonBody(req(JSON.stringify({ subject: 'a', topic: 'x'.repeat(LIMITS.jsonBodyChars + 10) })), ManualTopicBodySchema);
    expect(huge.ok).toBe(false);
    if (!huge.ok) expect(huge.response.status).toBe(413);
  });

  it('treats an empty body as {} (for schemas with all-optional fields)', async () => {
    const result = await parseJsonBody(req(''), NotesGenerateBodySchema.partial());
    expect(result.ok).toBe(true);
  });
});
