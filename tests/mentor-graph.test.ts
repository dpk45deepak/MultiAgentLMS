import { describe, it, expect, vi, beforeEach } from 'vitest';

const { runMentorAgentMock } = vi.hoisted(() => ({ runMentorAgentMock: vi.fn() }));

vi.mock('@/lib/agents/mentor-agent', () => ({
  runMentorAgent: runMentorAgentMock,
}));

import { mentorGraph } from '@/lib/langgraph/mentor-graph';

beforeEach(() => {
  runMentorAgentMock.mockReset();
});

describe('mentorGraph', () => {
  it('wires computePerformance, fetchLearnerContext, and fetchRecentTutorQuestions output into the mentor agent call', async () => {
    runMentorAgentMock.mockResolvedValue({
      summary: 'Summary',
      recommendations: [{ topic: 'Deadlocks', reason: 'R', action: 'A' }],
    });

    const computePerformance = vi.fn().mockResolvedValue({
      strong: ['CPU Scheduling'],
      moderate: [],
      weak: ['Deadlocks'],
      hasData: true,
    });
    const fetchLearnerContext = vi.fn().mockResolvedValue(['Studied Deadlocks recently.']);
    const fetchRecentTutorQuestions = vi.fn().mockResolvedValue(['Why is binary search O(log n)?']);

    const result = await mentorGraph.invoke(
      { userId: 'user-1', mentorDisplayName: 'AI Mentor' },
      { configurable: { computePerformance, fetchLearnerContext, fetchRecentTutorQuestions } }
    );

    expect(computePerformance).toHaveBeenCalledWith('user-1');
    expect(fetchLearnerContext).toHaveBeenCalledWith('user-1');
    expect(fetchRecentTutorQuestions).toHaveBeenCalledWith('user-1');
    expect(result.recommendation?.recommendations[0].topic).toBe('Deadlocks');

    const agentCallArg = runMentorAgentMock.mock.calls[0][0];
    expect(agentCallArg.performance.weak).toEqual(['Deadlocks']);
    expect(agentCallArg.learnerContext).toEqual(['Studied Deadlocks recently.']);
    expect(agentCallArg.recentTutorQuestions).toEqual(['Why is binary search O(log n)?']);
  });

  it('defaults recentTutorQuestions to an empty array when fetchRecentTutorQuestions is not provided', async () => {
    runMentorAgentMock.mockResolvedValue({ summary: 'S', recommendations: [{ topic: 'T', reason: 'R', action: 'A' }] });

    const result = await mentorGraph.invoke({ userId: 'user-1', mentorDisplayName: 'AI Mentor' }, {});

    expect(result.error).toBeUndefined();
    const agentCallArg = runMentorAgentMock.mock.calls[0][0];
    expect(agentCallArg.recentTutorQuestions).toEqual([]);
  });

  it('falls back to no-data performance when computePerformance is not provided', async () => {
    runMentorAgentMock.mockResolvedValue({ summary: 'S', recommendations: [{ topic: 'T', reason: 'R', action: 'A' }] });

    const result = await mentorGraph.invoke({ userId: 'user-1', mentorDisplayName: 'AI Mentor' }, {});

    expect(result.error).toBeUndefined();
    const agentCallArg = runMentorAgentMock.mock.calls[0][0];
    expect(agentCallArg.performance.hasData).toBe(false);
  });

  it('surfaces a safe error when the mentor agent throws', async () => {
    runMentorAgentMock.mockRejectedValue(new Error('Gemini overloaded'));

    const result = await mentorGraph.invoke({ userId: 'user-1', mentorDisplayName: 'AI Mentor' }, {});

    expect(result.error).toContain('Gemini overloaded');
  });
});
