import { describe, it, expect, vi, beforeEach } from 'vitest';

const invokeMock = vi.fn();

vi.mock('@/lib/ai/gemini', () => ({
  getStructuredModel: () => ({ invoke: invokeMock }),
  getVisionModel: () => ({ invoke: invokeMock }),
}));

import { runTutorAgent } from '@/lib/agents/tutor-agent';

beforeEach(() => {
  invokeMock.mockReset();
});

describe('runTutorAgent', () => {
  it('returns the model reply as plain text', async () => {
    invokeMock.mockResolvedValue({ content: 'Round Robin gives each process a fixed time slice.' });

    const reply = await runTutorAgent({
      topicName: 'CPU Scheduling',
      subjectName: 'Operating Systems',
      mode: 'normal',
      tutorDisplayName: 'AI Tutor',
      history: [],
      message: 'Explain Round Robin.',
    });

    expect(reply).toContain('time slice');
  });

  it('includes prior turns and the mode instruction in the prompt', async () => {
    invokeMock.mockResolvedValue({ content: 'It preempts after a fixed quantum.' });

    await runTutorAgent({
      topicName: 'CPU Scheduling',
      subjectName: 'Operating Systems',
      mode: 'exam_focused',
      tutorDisplayName: 'AI Tutor',
      history: [
        { role: 'user', content: 'What is CPU scheduling?' },
        { role: 'assistant', content: 'It decides which process runs next.' },
      ],
      message: 'Why is Round Robin better than FCFS?',
    });

    const sentMessages = invokeMock.mock.calls[0][0];
    const systemPrompt = sentMessages[0][1];
    expect(systemPrompt).toContain('CPU Scheduling');
    expect(systemPrompt.toLowerCase()).toContain('exam');
    // system + 2 history turns + new user message = 4
    expect(sentMessages.length).toBe(4);
  });

  it('throws when the model returns an empty response', async () => {
    invokeMock.mockResolvedValue({ content: '   ' });

    await expect(
      runTutorAgent({
        topicName: 'X',
        subjectName: 'Y',
        mode: 'normal',
        tutorDisplayName: 'AI Tutor',
        history: [],
        message: 'Hi',
      })
    ).rejects.toThrow(/empty response/i);
  });
});
