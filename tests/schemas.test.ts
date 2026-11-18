import { describe, it, expect } from 'vitest';
import {
  McqQuestionSchema,
  TopicAnalysisSchema,
  NotesSchema,
  AssessmentQuestionsSchema,
  MentorRecommendationSchema,
  SettingsUpdateSchema,
  ShortAnswerGradeSchema,
} from '@/lib/validation/schemas';

describe('TopicAnalysisSchema', () => {
  it('accepts a well-formed syllabus structure', () => {
    const result = TopicAnalysisSchema.safeParse({
      subject: 'Operating Systems',
      units: [
        {
          name: 'Unit 1',
          topics: [
            { name: 'Process Management', subtopics: [] },
            { name: 'CPU Scheduling', subtopics: ['Round Robin', 'FCFS'] },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a unit with no topics', () => {
    const result = TopicAnalysisSchema.safeParse({
      subject: 'Operating Systems',
      units: [{ name: 'Unit 1', topics: [] }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing subject', () => {
    const result = TopicAnalysisSchema.safeParse({
      units: [{ name: 'Unit 1', topics: [{ name: 'X', subtopics: [] }] }],
    });
    expect(result.success).toBe(false);
  });

  it('defaults subtopics to an empty array when omitted', () => {
    const result = TopicAnalysisSchema.safeParse({
      subject: 'DBMS',
      units: [{ name: 'Unit 1', topics: [{ name: 'Normalization' }] }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.units[0].topics[0].subtopics).toEqual([]);
    }
  });
});

describe('NotesSchema', () => {
  it('accepts notes with enough sections', () => {
    const result = NotesSchema.safeParse({
      topic: 'Deadlocks',
      sections: [
        { key: 'overview', title: 'Overview', content_markdown: 'A deadlock is...' },
        { key: 'definition', title: 'Definition', content_markdown: 'Formally...' },
        { key: 'types', title: 'Types', content_markdown: '- A\n- B' },
        { key: 'examples', title: 'Examples', content_markdown: 'For instance...' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts the model casing variant for markdown content', () => {
    const result = NotesSchema.safeParse({
      topic: 'Deadlocks',
      sections: [
        { key: 'overview', title: 'Overview', contentMarkdown: 'A deadlock is...' },
        { key: 'definition', title: 'Definition', contentMarkdown: 'Formally...' },
        { key: 'types', title: 'Types', contentMarkdown: '- A\n- B' },
        { key: 'examples', title: 'Examples', contentMarkdown: 'For instance...' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown section key', () => {
    const result = NotesSchema.safeParse({
      topic: 'Deadlocks',
      sections: [
        { key: 'not_a_real_section', title: 'X', content_markdown: 'Y' },
        { key: 'definition', title: 'Definition', content_markdown: 'Y' },
        { key: 'types', title: 'Types', content_markdown: 'Y' },
        { key: 'examples', title: 'Examples', content_markdown: 'Y' },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects too few sections', () => {
    const result = NotesSchema.safeParse({
      topic: 'Deadlocks',
      sections: [{ key: 'overview', title: 'Overview', content_markdown: 'Short.' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('AssessmentQuestionsSchema', () => {
  it('accepts a well-formed MCQ set', () => {
    const result = AssessmentQuestionsSchema.safeParse({
      questions: [
        {
          question: 'What causes a deadlock?',
          type: 'mcq',
          options: ['Mutual exclusion + hold-and-wait + no preemption + circular wait', 'Too much RAM', 'Fast CPU', 'Low disk space'],
          correctAnswer: 'Mutual exclusion + hold-and-wait + no preemption + circular wait',
          explanation: 'These four conditions must hold simultaneously.',
          difficulty: 'medium',
          concept: 'Deadlock Conditions',
        },
        {
          question: 'Which algorithm avoids deadlock by checking safe states?',
          type: 'mcq',
          options: ["Banker's Algorithm", 'Round Robin', 'FCFS', 'SJF'],
          correctAnswer: "Banker's Algorithm",
          explanation: "Banker's Algorithm simulates allocation to verify a safe state.",
          difficulty: 'medium',
          concept: "Banker's Algorithm",
        },
        {
          question: 'Deadlock detection typically uses which structure?',
          type: 'mcq',
          options: ['Resource allocation graph', 'Binary search tree', 'Hash map', 'Linked list'],
          correctAnswer: 'Resource allocation graph',
          explanation: 'Cycles in the resource allocation graph indicate a deadlock.',
          difficulty: 'easy',
          concept: 'Deadlock Detection',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a question with fewer than 4 options', () => {
    const result = AssessmentQuestionsSchema.safeParse({
      questions: [
        {
          question: 'X?',
          type: 'mcq',
          options: ['A', 'B', 'C'],
          correctAnswer: 'A',
          explanation: 'Because.',
          difficulty: 'easy',
          concept: 'X',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects fewer than 3 questions', () => {
    const result = AssessmentQuestionsSchema.safeParse({
      questions: [
        {
          question: 'X?',
          type: 'mcq',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'A',
          explanation: 'Because.',
          difficulty: 'easy',
          concept: 'X',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('accepts a well-formed short_answer question', () => {
    const result = AssessmentQuestionsSchema.safeParse({
      questions: [
        {
          question: "Why does the Banker's Algorithm avoid unsafe states?",
          type: 'short_answer',
          modelAnswer: 'It simulates allocation before granting and only proceeds if the state stays safe.',
          rubric: 'Mentions simulating before granting; mentions safe-state check.',
          maxMarks: 5,
          explanation: 'This is the core idea behind the algorithm.',
          difficulty: 'medium',
          concept: "Banker's Algorithm",
        },
        {
          question: 'What causes a deadlock?',
          type: 'mcq',
          options: ['Mutual exclusion + hold-and-wait + no preemption + circular wait', 'Too much RAM', 'Fast CPU', 'Low disk space'],
          correctAnswer: 'Mutual exclusion + hold-and-wait + no preemption + circular wait',
          explanation: 'These four conditions must hold simultaneously.',
          difficulty: 'medium',
          concept: 'Deadlock Conditions',
        },
        {
          question: 'Deadlock detection typically uses which structure?',
          type: 'mcq',
          options: ['Resource allocation graph', 'Binary search tree', 'Hash map', 'Linked list'],
          correctAnswer: 'Resource allocation graph',
          explanation: 'Cycles in the resource allocation graph indicate a deadlock.',
          difficulty: 'easy',
          concept: 'Deadlock Detection',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a short_answer question missing its rubric', () => {
    const result = AssessmentQuestionsSchema.safeParse({
      questions: [
        {
          question: 'X?',
          type: 'short_answer',
          modelAnswer: 'Because.',
          maxMarks: 5,
          explanation: 'Because.',
          difficulty: 'easy',
          concept: 'X',
        },
        {
          question: 'Y?',
          type: 'mcq',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'A',
          explanation: 'Because.',
          difficulty: 'easy',
          concept: 'Y',
        },
        {
          question: 'Z?',
          type: 'mcq',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'A',
          explanation: 'Because.',
          difficulty: 'easy',
          concept: 'Z',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a short_answer question with maxMarks out of range', () => {
    const result = AssessmentQuestionsSchema.safeParse({
      questions: [
        {
          question: 'X?',
          type: 'short_answer',
          modelAnswer: 'Because.',
          rubric: 'Mentions the reason.',
          maxMarks: 0,
          explanation: 'Because.',
          difficulty: 'easy',
          concept: 'X',
        },
        {
          question: 'Y?',
          type: 'mcq',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'A',
          explanation: 'Because.',
          difficulty: 'easy',
          concept: 'Y',
        },
        {
          question: 'Z?',
          type: 'mcq',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'A',
          explanation: 'Because.',
          difficulty: 'easy',
          concept: 'Z',
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe('MentorRecommendationSchema', () => {
  it('accepts a well-formed recommendation', () => {
    const result = MentorRecommendationSchema.safeParse({
      summary: 'You are strong in CPU Scheduling but weak in Deadlocks.',
      recommendations: [
        { topic: 'Deadlocks', reason: 'Scored 40% across two attempts.', action: 'Revise Banker\u2019s Algorithm.' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty recommendations array', () => {
    const result = MentorRecommendationSchema.safeParse({ summary: 'X', recommendations: [] });
    expect(result.success).toBe(false);
  });
});

describe('SettingsUpdateSchema', () => {
  it('accepts a partial update with just one field', () => {
    const result = SettingsUpdateSchema.safeParse({ tutorDisplayName: 'Mr. Turing' });
    expect(result.success).toBe(true);
  });

  it('accepts an empty object (no-op update)', () => {
    const result = SettingsUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects an invalid preferredLanguage', () => {
    const result = SettingsUpdateSchema.safeParse({ preferredLanguage: 'french' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty tutor display name', () => {
    const result = SettingsUpdateSchema.safeParse({ tutorDisplayName: '' });
    expect(result.success).toBe(false);
  });
});

describe('ShortAnswerGradeSchema', () => {
  it('accepts a well-formed grade', () => {
    const result = ShortAnswerGradeSchema.safeParse({
      score: 4,
      maxScore: 5,
      feedback: 'Good answer, missed one point.',
      strengths: ['Correctly identified the main idea'],
      improvements: ['Mention the safe-state check explicitly'],
      confidence: 0.85,
    });
    expect(result.success).toBe(true);
  });

  it('defaults strengths/improvements to an empty array when omitted', () => {
    const result = ShortAnswerGradeSchema.safeParse({
      score: 0,
      maxScore: 5,
      feedback: 'No answer was submitted.',
      confidence: 1,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.strengths).toEqual([]);
      expect(result.data.improvements).toEqual([]);
    }
  });

  it('rejects a confidence value outside 0-1', () => {
    const result = ShortAnswerGradeSchema.safeParse({
      score: 4,
      maxScore: 5,
      feedback: 'Good.',
      confidence: 1.5,
    });
    expect(result.success).toBe(false);
  });
});

describe('MCQ answer-key validity', () => {
  const base = {
    question: 'What is a deadlock?',
    type: 'mcq' as const,
    explanation: 'Because.',
    difficulty: 'easy' as const,
    concept: 'Deadlocks',
  };
  const options = ['Circular wait', 'Fast CPU', 'Memory leak', 'Timeout'];

  it('accepts a correctAnswer copied from the options', () => {
    expect(McqQuestionSchema.safeParse({ ...base, options, correctAnswer: 'Circular wait' }).success).toBe(true);
  });

  it('rejects a letter answer such as "B" (would score every student 0)', () => {
    const result = McqQuestionSchema.safeParse({ ...base, options, correctAnswer: 'B' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toContain('exactly');
  });

  it('rejects a slightly reworded correctAnswer', () => {
    expect(McqQuestionSchema.safeParse({ ...base, options, correctAnswer: 'circular wait.' }).success).toBe(false);
  });

  it('rejects duplicate options', () => {
    expect(
      McqQuestionSchema.safeParse({ ...base, options: ['A one', 'a one', 'B', 'C'], correctAnswer: 'B' }).success
    ).toBe(false);
  });

  it('applies the same rule inside the full assessment schema', () => {
    const bad = { questions: [{ ...base, options, correctAnswer: 'C' }] };
    expect(AssessmentQuestionsSchema.safeParse(bad).success).toBe(false);
  });
});

