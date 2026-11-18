import { describe, it, expect, vi, beforeEach } from 'vitest';

const invokeMock = vi.fn();

vi.mock('@/lib/ai/gemini', () => ({
  getStructuredModel: () => ({ invoke: invokeMock }),
  getVisionModel: () => ({ invoke: invokeMock }),
}));

import { runNotesAgent } from '@/lib/agents/notes-agent';
import { runSyllabusAgent } from '@/lib/agents/syllabus-agent';

const VALID_NOTES = {
  topic: 'Deadlocks',
  sections: [
    { key: 'overview', title: 'Overview', content_markdown: 'A deadlock occurs when...' },
    { key: 'definition', title: 'Definition', content_markdown: 'Formally, a deadlock is...' },
    { key: 'types', title: 'Types', content_markdown: '- Resource deadlock\n- Communication deadlock' },
    { key: 'examples', title: 'Examples', content_markdown: 'Two processes each holding a lock...' },
  ],
};

const VALID_TOPIC_ANALYSIS = {
  subject: 'Operating Systems',
  units: [{ name: 'Unit 3', topics: [{ name: 'Deadlocks', subtopics: ['Detection', "Banker's Algorithm"] }] }],
};

beforeEach(() => {
  invokeMock.mockReset();
});

describe('runNotesAgent', () => {
  it('returns validated notes for a well-formed model response', async () => {
    invokeMock.mockResolvedValue({ content: JSON.stringify(VALID_NOTES) });

    const notes = await runNotesAgent({
      subject: 'Operating Systems',
      topic: 'Deadlocks',
      subtopics: ['Detection', "Banker's Algorithm"],
    });

    expect(notes.topic).toBe('Deadlocks');
    expect(notes.sections.length).toBeGreaterThanOrEqual(4);
  });

  it('includes the subject and topic in the prompt sent to the model', async () => {
    invokeMock.mockResolvedValue({ content: JSON.stringify(VALID_NOTES) });
    await runNotesAgent({ subject: 'Operating Systems', topic: 'Deadlocks', subtopics: [] });

    const [, userMessage] = invokeMock.mock.calls[0][0];
    expect(userMessage[1]).toContain('Operating Systems');
    expect(userMessage[1]).toContain('Deadlocks');
  });
});

describe('runSyllabusAgent', () => {
  it('returns validated topic analysis for text input', async () => {
    invokeMock.mockResolvedValue({ content: JSON.stringify(VALID_TOPIC_ANALYSIS) });

    const analysis = await runSyllabusAgent({
      mode: 'text',
      text: 'Operating System\nUnit 3:\nDeadlocks',
    });

    expect(analysis.subject).toBe('Operating Systems');
    expect(analysis.units[0].topics[0].name).toBe('Deadlocks');
  });

  it('sends multimodal content for image input', async () => {
    invokeMock.mockResolvedValue({ content: JSON.stringify(VALID_TOPIC_ANALYSIS) });

    await runSyllabusAgent({ mode: 'image', base64Image: 'ZmFrZQ==', mimeType: 'image/png' });

    const [, userMessage] = invokeMock.mock.calls[0][0];
    expect(Array.isArray(userMessage[1])).toBe(true);
    expect(userMessage[1][1]).toMatchObject({
      type: 'media',
      mimeType: 'image/png',
      data: 'ZmFrZQ==',
    });
  });
});
