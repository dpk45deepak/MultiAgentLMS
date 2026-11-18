import { describe, it, expect, vi, beforeEach } from 'vitest';

const { runTutorAgentMock } = vi.hoisted(() => ({ runTutorAgentMock: vi.fn() }));

vi.mock('@/lib/agents/tutor-agent', () => ({
  runTutorAgent: runTutorAgentMock,
}));

import { tutorChatGraph } from '@/lib/langgraph/tutor-chat-graph';

beforeEach(() => {
  runTutorAgentMock.mockReset();
});

describe('tutorChatGraph', () => {
  it('passes injected history into the tutor agent call', async () => {
    runTutorAgentMock.mockResolvedValue('Here is the explanation.');
    const fetchRecentHistory = vi.fn().mockResolvedValue([{ role: 'user', content: 'What is a deadlock?' }]);

    const result = await tutorChatGraph.invoke(
      {
        sessionId: 'session-1',
        topicName: 'Deadlocks',
        subjectName: 'OS',
        mode: 'normal',
        tutorDisplayName: 'AI Tutor',
        message: 'Explain further',
      },
      { configurable: { fetchRecentHistory } }
    );

    expect(fetchRecentHistory).toHaveBeenCalledWith('session-1');
    expect(result.reply).toBe('Here is the explanation.');
    expect(runTutorAgentMock.mock.calls[0][0].history).toHaveLength(1);
  });

  it('proceeds with empty history when no fetcher is configured', async () => {
    runTutorAgentMock.mockResolvedValue('Reply');
    const result = await tutorChatGraph.invoke(
      {
        sessionId: 'session-1',
        topicName: 'Deadlocks',
        subjectName: 'OS',
        mode: 'normal',
        tutorDisplayName: 'AI Tutor',
        message: 'Hi',
      },
      {}
    );
    expect(result.error).toBeUndefined();
    expect(runTutorAgentMock.mock.calls[0][0].history).toEqual([]);
  });

  it('surfaces a safe error when the tutor agent throws', async () => {
    runTutorAgentMock.mockRejectedValue(new Error('empty response'));
    const result = await tutorChatGraph.invoke(
      {
        sessionId: 'session-1',
        topicName: 'Deadlocks',
        subjectName: 'OS',
        mode: 'normal',
        tutorDisplayName: 'AI Tutor',
        message: 'Hi',
      },
      {}
    );
    expect(result.error).toContain('empty response');
  });
});
