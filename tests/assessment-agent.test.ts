import { describe, it, expect, vi, beforeEach } from 'vitest';

const invokeMock = vi.fn();

vi.mock('@/lib/ai/gemini', () => ({
  getStructuredModel: () => ({ invoke: invokeMock }),
  getVisionModel: () => ({ invoke: invokeMock }),
}));

import { runAssessmentAgent } from '@/lib/agents/assessment-agent';

const VALID_RESPONSE = {
  questions: [
    {
      question: 'What is a deadlock?',
      type: 'mcq',
      options: ['A circular wait for resources', 'A fast CPU state', 'A memory leak', 'A network timeout'],
      correctAnswer: 'A circular wait for resources',
      explanation: 'A deadlock is a cycle of processes each waiting on the other.',
      difficulty: 'medium',
      concept: 'Deadlock Definition',
    },
    {
      question: "Which technique proactively avoids unsafe states?",
      type: 'mcq',
      options: ["Banker's Algorithm", 'Round Robin', 'Paging', 'Caching'],
      correctAnswer: "Banker's Algorithm",
      explanation: "Banker's Algorithm checks whether an allocation keeps the system in a safe state.",
      difficulty: 'medium',
      concept: "Banker's Algorithm",
    },
    {
      question: 'Deadlock detection commonly relies on identifying a cycle in which structure?',
      type: 'mcq',
      options: ['Resource allocation graph', 'B-tree', 'Hash table', 'Stack'],
      correctAnswer: 'Resource allocation graph',
      explanation: 'A cycle in the resource allocation graph indicates a deadlock.',
      difficulty: 'easy',
      concept: 'Deadlock Detection',
    },
  ],
};

beforeEach(() => {
  invokeMock.mockReset();
});

describe('runAssessmentAgent', () => {
  it('returns a validated question set', async () => {
    invokeMock.mockResolvedValue({ content: JSON.stringify(VALID_RESPONSE) });

    const result = await runAssessmentAgent({
      subject: 'Operating Systems',
      topic: 'Deadlocks',
      difficulty: 'medium',
      mcqCount: 3,
      shortAnswerCount: 0,
    });

    expect(result.questions).toHaveLength(3);
    expect(result.questions[0].type).toBe('mcq');
  });

  it('sends the requested difficulty and question mix in the prompt', async () => {
    invokeMock.mockResolvedValue({ content: JSON.stringify(VALID_RESPONSE) });

    await runAssessmentAgent({ subject: 'OS', topic: 'Deadlocks', difficulty: 'hard', mcqCount: 3, shortAnswerCount: 2 });

    const userMessage = invokeMock.mock.calls[0][0][1][1];
    expect(userMessage).toContain('5 questions');
    expect(userMessage).toContain('3 multiple-choice questions and 2 short-answer questions');
    expect(userMessage).toContain('"hard"');
  });

  it('accepts a mixed set of mcq and short_answer questions', async () => {
    const mixed = {
      questions: [
        ...VALID_RESPONSE.questions,
        {
          question: 'Explain why the Banker\u2019s Algorithm avoids unsafe states.',
          type: 'short_answer',
          modelAnswer:
            'It simulates resource allocation before granting a request and only proceeds if the resulting state is still safe, i.e. every process could still finish given the remaining resources.',
          rubric: 'Mentions simulating allocation before granting; mentions checking for a safe state; mentions all processes can still finish.',
          maxMarks: 5,
          explanation: 'This is the core safety-check idea behind the algorithm.',
          difficulty: 'medium',
          concept: "Banker's Algorithm",
        },
      ],
    };
    invokeMock.mockResolvedValue({ content: JSON.stringify(mixed) });

    const result = await runAssessmentAgent({
      subject: 'OS',
      topic: 'Deadlocks',
      difficulty: 'medium',
      mcqCount: 3,
      shortAnswerCount: 1,
    });

    expect(result.questions).toHaveLength(4);
    const shortAnswer = result.questions.find((q) => q.type === 'short_answer');
    expect(shortAnswer).toBeDefined();
    expect(shortAnswer && 'maxMarks' in shortAnswer && shortAnswer.maxMarks).toBe(5);
  });

  it('retries and eventually throws a safe error on repeated invalid output', async () => {
    invokeMock.mockResolvedValue({ content: '{ "questions": [] }' }); // fails min(3)

    await expect(
      runAssessmentAgent({ subject: 'OS', topic: 'Deadlocks', difficulty: 'medium', mcqCount: 3, shortAnswerCount: 0 })
    ).rejects.toThrow(/could not validate/i);
    expect(invokeMock).toHaveBeenCalledTimes(2);
  });
});
