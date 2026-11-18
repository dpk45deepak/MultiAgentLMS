import { getStructuredModel } from '@/lib/ai/gemini';
import { generateStructured } from '@/lib/ai/structured';
import { AssessmentQuestionsSchema, type AssessmentQuestions } from '@/lib/validation/schemas';
import { buildAssessmentSystemPrompt } from '@/prompts/assessment';
import type { PreferredLanguage } from '@/prompts/language';

export interface AssessmentAgentInput {
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  /** Number of multiple-choice questions to generate. */
  mcqCount: number;
  /** Number of short-answer questions to generate (0 for an MCQ-only assessment). */
  shortAnswerCount: number;
  language?: PreferredLanguage;
  /** Concept names already used for this topic; the model should reuse them. */
  knownConcepts?: string[];
}

const RESPONSE_SCHEMA_DESCRIPTION = `{
  "questions": [
    // MCQ variant:
    {
      "question": string,
      "type": "mcq",
      "options": [string, string, string, string],
      "correctAnswer": string,
      "explanation": string,
      "difficulty": "easy" | "medium" | "hard",
      "concept": string
    },
    // Short-answer variant:
    {
      "question": string,
      "type": "short_answer",
      "modelAnswer": string,
      "rubric": string,
      "maxMarks": number,
      "explanation": string,
      "difficulty": "easy" | "medium" | "hard",
      "concept": string
    }
  ]
}`;

/**
 * ASSESSMENT_AGENT — internal id: ASSESSMENT_AGENT.
 * Pure function: (subject, topic, difficulty, mix) -> validated question
 * set. Persistence and answer-stripping-before-sending-to-client both
 * happen in the caller (/api/assessment/generate route) — this agent never
 * sees or cares which parts a client is allowed to view.
 *
 * Feature 5: generates a hybrid mix of MCQ and short-answer questions in a
 * single structured call (rather than two separate LLM calls), since both
 * variants live in one discriminated-union schema (AssessmentQuestionSchema).
 */
export async function runAssessmentAgent(input: AssessmentAgentInput): Promise<AssessmentQuestions> {
  const model = getStructuredModel({ temperature: 0.5, maxOutputTokens: 4096 });

  const totalCount = input.mcqCount + input.shortAnswerCount;
  const mixDescription =
    input.shortAnswerCount > 0
      ? `${input.mcqCount} multiple-choice questions and ${input.shortAnswerCount} short-answer questions`
      : `${input.mcqCount} multiple-choice questions`;

  const conceptsBlock =
    input.knownConcepts && input.knownConcepts.length > 0
      ? `\n\nEXISTING CONCEPTS for this topic (reuse these exact names where a question tests the same idea):\n- ${input.knownConcepts.join('\n- ')}`
      : '';

  const instruction = `Generate ${totalCount} questions at "${input.difficulty}" difficulty for this topic: ${mixDescription}.

Subject: ${input.subject}
Topic: ${input.topic}${conceptsBlock}

Return a JSON object matching exactly this shape:
${RESPONSE_SCHEMA_DESCRIPTION}`;

  return generateStructured(model, AssessmentQuestionsSchema, [
    ['system', buildAssessmentSystemPrompt(input.language)],
    ['user', instruction],
  ]);
}
