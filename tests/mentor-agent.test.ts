import { describe, it, expect, vi, beforeEach } from 'vitest';

const invokeMock = vi.fn();

vi.mock('@/lib/ai/gemini', () => ({
  getStructuredModel: () => ({ invoke: invokeMock }),
  getVisionModel: () => ({ invoke: invokeMock }),
}));

import { runMentorAgent } from '@/lib/agents/mentor-agent';

beforeEach(() => {
  invokeMock.mockReset();
});

describe('runMentorAgent', () => {
  it('returns an honest no-data response without calling the model', async () => {
    const result = await runMentorAgent({
      performance: { strong: [], moderate: [], weak: [], hasData: false },
      learnerContext: [],
      recentTutorQuestions: [],
      mentorDisplayName: 'AI Mentor',
    });

    expect(result.summary.toLowerCase()).toContain("haven't completed an assessment");
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('returns a validated recommendation grounded in the given performance data', async () => {
    invokeMock.mockResolvedValue({
      content: JSON.stringify({
        summary: 'Strong in CPU Scheduling, weak in Deadlocks.',
        recommendations: [
          { topic: 'Deadlocks', reason: 'Averaged 25% across two attempts.', action: 'Revisit the notes, then retry an easy test.' },
        ],
      }),
    });

    const result = await runMentorAgent({
      performance: { strong: ['CPU Scheduling'], moderate: [], weak: ['Deadlocks'], hasData: true },
      learnerContext: ['Generated and studied notes for "Deadlocks".'],
      recentTutorQuestions: [],
      mentorDisplayName: 'AI Mentor',
    });

    expect(result.recommendations[0].topic).toBe('Deadlocks');
  });

  it('includes the computed performance breakdown in the prompt, not invented data', async () => {
    invokeMock.mockResolvedValue({
      content: JSON.stringify({
        summary: 'X',
        recommendations: [{ topic: 'Deadlocks', reason: 'Y', action: 'Z' }],
      }),
    });

    await runMentorAgent({
      performance: { strong: ['CPU Scheduling'], moderate: ['Memory Management'], weak: ['Deadlocks'], hasData: true },
      learnerContext: [],
      recentTutorQuestions: [],
      mentorDisplayName: 'AI Mentor',
    });

    const userMessage = invokeMock.mock.calls[0][0][1][1];
    expect(userMessage).toContain('CPU Scheduling');
    expect(userMessage).toContain('Memory Management');
    expect(userMessage).toContain('Deadlocks');
  });

  it('includes recent Tutor questions in the prompt when provided', async () => {
    invokeMock.mockResolvedValue({
      content: JSON.stringify({
        summary: 'X',
        recommendations: [{ topic: 'Deadlocks', reason: 'Y', action: 'Z' }],
      }),
    });

    await runMentorAgent({
      performance: { strong: [], moderate: [], weak: ['Deadlocks'], hasData: true },
      learnerContext: [],
      recentTutorQuestions: ['Why is binary search O(log n)?', 'Explain 2NF with an example'],
      mentorDisplayName: 'AI Mentor',
    });

    const userMessage = invokeMock.mock.calls[0][0][1][1];
    expect(userMessage).toContain('Why is binary search O(log n)?');
    expect(userMessage).toContain('Explain 2NF with an example');
  });

  it('omits the recent-questions section entirely when there are none', async () => {
    invokeMock.mockResolvedValue({
      content: JSON.stringify({ summary: 'X', recommendations: [{ topic: 'T', reason: 'R', action: 'A' }] }),
    });

    await runMentorAgent({
      performance: { strong: [], moderate: [], weak: ['Deadlocks'], hasData: true },
      learnerContext: [],
      recentTutorQuestions: [],
      mentorDisplayName: 'AI Mentor',
    });

    const userMessage = invokeMock.mock.calls[0][0][1][1];
    expect(userMessage).not.toContain('RECENT QUESTIONS');
  });
});
