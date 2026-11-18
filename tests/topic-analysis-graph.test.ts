import { describe, it, expect, vi, beforeEach } from 'vitest';

const { runSyllabusAgentMock } = vi.hoisted(() => ({ runSyllabusAgentMock: vi.fn() }));

vi.mock('@/lib/agents/syllabus-agent', () => ({
  runSyllabusAgent: runSyllabusAgentMock,
}));

import { topicAnalysisGraph } from '@/lib/langgraph/topic-analysis-graph';

beforeEach(() => {
  runSyllabusAgentMock.mockReset();
});

describe('topicAnalysisGraph', () => {
  it('short-circuits on empty text input without calling the agent', async () => {
    const result = await topicAnalysisGraph.invoke({ input: { mode: 'text', text: '   ' } });
    expect(result.error).toBeTruthy();
    expect(runSyllabusAgentMock).not.toHaveBeenCalled();
  });

  it('returns the agent result when input is valid', async () => {
    runSyllabusAgentMock.mockResolvedValue({
      subject: 'DBMS',
      units: [{ name: 'Unit 1', topics: [{ name: 'Normalization', subtopics: [] }] }],
    });

    const result = await topicAnalysisGraph.invoke({ input: { mode: 'text', text: 'DBMS syllabus...' } });
    expect(result.error).toBeUndefined();
    expect(result.result?.subject).toBe('DBMS');
  });

  it('surfaces a safe error message when the agent throws', async () => {
    runSyllabusAgentMock.mockRejectedValue(new Error('Gemini quota exceeded'));

    const result = await topicAnalysisGraph.invoke({ input: { mode: 'text', text: 'DBMS syllabus...' } });
    expect(result.error).toContain('Gemini quota exceeded');
    expect(result.result).toBeUndefined();
  });
});
