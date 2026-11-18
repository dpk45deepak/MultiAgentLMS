import { describe, it, expect, vi, beforeEach } from 'vitest';

const { runGradingAgentMock } = vi.hoisted(() => ({ runGradingAgentMock: vi.fn() }));

vi.mock('@/lib/agents/grading-agent', () => ({
  runGradingAgent: runGradingAgentMock,
}));

import { gradingGraph } from '@/lib/langgraph/grading-graph';

beforeEach(() => {
  runGradingAgentMock.mockReset();
});

describe('gradingGraph', () => {
  it('returns the grade produced by the grading agent', async () => {
    runGradingAgentMock.mockResolvedValue({
      score: 4,
      maxScore: 5,
      feedback: 'Good answer.',
      strengths: ['Clear explanation'],
      improvements: [],
      confidence: 0.9,
    });

    const result = await gradingGraph.invoke({
      question: 'Q',
      studentAnswer: 'A',
      modelAnswer: 'M',
      rubric: 'R',
      maxMarks: 5,
    });

    expect(result.error).toBeUndefined();
    expect(result.grade?.score).toBe(4);
    expect(runGradingAgentMock).toHaveBeenCalledWith({
      question: 'Q',
      studentAnswer: 'A',
      modelAnswer: 'M',
      rubric: 'R',
      maxMarks: 5,
    });
  });

  it('surfaces a safe error instead of throwing when grading fails', async () => {
    runGradingAgentMock.mockRejectedValue(new Error('Gemini overloaded'));

    const result = await gradingGraph.invoke({
      question: 'Q',
      studentAnswer: 'A',
      modelAnswer: 'M',
      rubric: 'R',
      maxMarks: 5,
    });

    expect(result.grade).toBeUndefined();
    expect(result.error).toContain('Gemini overloaded');
  });
});
