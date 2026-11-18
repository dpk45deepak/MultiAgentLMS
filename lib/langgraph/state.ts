import { Annotation } from '@langchain/langgraph';
import type { SyllabusAgentInput } from '@/lib/agents/syllabus-agent';
import type { TopicAnalysis, Notes, AssessmentQuestions, MentorRecommendation, ShortAnswerGrade } from '@/lib/validation/schemas';
import type { TutorChatTurn, TutorMode } from '@/lib/agents/tutor-agent';
import type { PerformanceBreakdown } from '@/lib/agents/performance-agent';
import type { PreferredLanguage } from '@/prompts/language';

/**
 * Graph state for the "learn: analyse syllabus" flow.
 * START -> classifyInput -> syllabusAgent -> END
 */
export const TopicAnalysisState = Annotation.Root({
  input: Annotation<SyllabusAgentInput>(),
  result: Annotation<TopicAnalysis | undefined>(),
  error: Annotation<string | undefined>(),
  /** 'busy' when every AI provider failed (retryable), as opposed to unreadable input. */
  errorKind: Annotation<'busy' | undefined>(),
});

export type TopicAnalysisStateType = typeof TopicAnalysisState.State;

/**
 * Graph state for the "learn: generate notes" flow.
 * START -> contextRetrieval -> notesAgent -> END
 * (The "Memory Update" step from the product spec's flow diagram runs in
 * the API route after the graph returns, once the note rows have real
 * database ids to attach the memory record to — see
 * app/api/notes/generate/route.ts for why that boundary was chosen.)
 */
export const NotesGenerationState = Annotation.Root({
  userId: Annotation<string>(),
  subject: Annotation<string>(),
  topic: Annotation<string>(),
  subtopics: Annotation<string[]>(),
  language: Annotation<PreferredLanguage | undefined>(),
  learnerContext: Annotation<string[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  notes: Annotation<Notes | undefined>(),
  error: Annotation<string | undefined>(),
});

export type NotesGenerationStateType = typeof NotesGenerationState.State;

/**
 * Graph state for the tutor doubt-solving flow.
 * START -> contextRetrieval -> tutorAgent -> END
 * (contextRetrieval fetches recent chat_messages — short-term memory —
 * through an injected function, same pattern as NotesGenerationState.)
 */
export const TutorChatState = Annotation.Root({
  sessionId: Annotation<string>(),
  topicName: Annotation<string>(),
  subjectName: Annotation<string>(),
  mode: Annotation<TutorMode>(),
  tutorDisplayName: Annotation<string>(),
  message: Annotation<string>(),
  language: Annotation<PreferredLanguage | undefined>(),
  history: Annotation<TutorChatTurn[]>({ reducer: (_p, n) => n, default: () => [] }),
  reply: Annotation<string | undefined>(),
  error: Annotation<string | undefined>(),
});

export type TutorChatStateType = typeof TutorChatState.State;

/**
 * Graph state for assessment generation.
 * START -> assessmentAgent -> END
 */
export const AssessmentGenerationState = Annotation.Root({
  subject: Annotation<string>(),
  topic: Annotation<string>(),
  difficulty: Annotation<'easy' | 'medium' | 'hard'>(),
  mcqCount: Annotation<number>(),
  shortAnswerCount: Annotation<number>(),
  language: Annotation<PreferredLanguage | undefined>(),
  knownConcepts: Annotation<string[] | undefined>(),
  questions: Annotation<AssessmentQuestions | undefined>(),
  error: Annotation<string | undefined>(),
});

export type AssessmentGenerationStateType = typeof AssessmentGenerationState.State;

/**
 * Graph state for grading a single short-answer response (Feature 5).
 * START -> gradingAgent -> END
 * One invocation grades one question; the submit route invokes this once
 * per short-answer question in the attempt.
 */
export const GradingState = Annotation.Root({
  question: Annotation<string>(),
  studentAnswer: Annotation<string>(),
  modelAnswer: Annotation<string>(),
  rubric: Annotation<string>(),
  maxMarks: Annotation<number>(),
  language: Annotation<PreferredLanguage | undefined>(),
  grade: Annotation<ShortAnswerGrade | undefined>(),
  error: Annotation<string | undefined>(),
});

export type GradingStateType = typeof GradingState.State;

/**
 * Graph state for the mentor recommendation flow.
 * START -> performanceAnalysis -> contextRetrieval -> mentorAgent -> END
 */
export const MentorState = Annotation.Root({
  userId: Annotation<string>(),
  mentorDisplayName: Annotation<string>(),
  language: Annotation<PreferredLanguage | undefined>(),
  performance: Annotation<PerformanceBreakdown | undefined>(),
  learnerContext: Annotation<string[]>({ reducer: (_p, n) => n, default: () => [] }),
  // Feature 6: the student's own recent questions to the Tutor, most recent
  // first — read from chat_messages (already persisted; nothing new to
  // write). Kept as a separate field from learnerContext (which holds
  // learning_memory summaries) so the prompt can label the two distinctly.
  recentTutorQuestions: Annotation<string[]>({ reducer: (_p, n) => n, default: () => [] }),
  recommendation: Annotation<MentorRecommendation | undefined>(),
  error: Annotation<string | undefined>(),
});

export type MentorStateType = typeof MentorState.State;
