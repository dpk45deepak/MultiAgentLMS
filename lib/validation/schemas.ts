import { z } from 'zod';
import { isValidTimezone } from '@/lib/streak';

/**
 * Structured output contract for the Syllabus / Topic Analysis Agent.
 * The agent must return exactly this shape — see prompts/syllabus.ts.
 */
export const TopicAnalysisSchema = z.object({
  subject: z.string().min(1, 'Subject name is required'),
  units: z
    .array(
      z.object({
        name: z.string().min(1),
        topics: z
          .array(
            z.object({
              name: z.string().min(1),
              subtopics: z.array(z.string()).default([]),
            })
          )
          .min(1, 'Each unit needs at least one topic'),
      })
    )
    .min(1, 'At least one unit is required'),
});

export type TopicAnalysis = z.infer<typeof TopicAnalysisSchema>;

/**
 * Structured output contract for the Notes / Learning Agent.
 * Every section is optional except definition + overview, since not every
 * topic meaningfully has, e.g., a diagram.
 */
export const NoteSectionKey = z.enum([
  'overview',
  'definition',
  'why_it_matters',
  'core_concept',
  'types',
  'working',
  'diagram',
  'advantages',
  'disadvantages',
  'applications',
  'examples',
  'exam_points',
  'quick_revision',
  'common_mistakes',
  'practice_questions',
]);

export const NotesSchema = z.preprocess(
  (value) => {
    if (!value || typeof value !== 'object' || !('sections' in value) || !Array.isArray(value.sections)) {
      return value;
    }

    return {
      ...value,
      sections: value.sections.map((section) => {
        if (!section || typeof section !== 'object') return section;
        const sectionRecord = section as Record<string, unknown>;
        return {
          ...sectionRecord,
          content_markdown: sectionRecord.content_markdown ?? sectionRecord.contentMarkdown,
        };
      }),
    };
  },
  z.object({
    topic: z.string().min(1),
    sections: z
      .array(
        z.object({
          key: NoteSectionKey,
          title: z.string().min(1),
          content_markdown: z.string().min(1),
        })
      )
      .min(4, 'Notes must contain at least a handful of sections'),
  })
);

export type Notes = z.infer<typeof NotesSchema>;

/** Human-readable titles for each section key, used by the notes reader UI. */
export const SECTION_TITLES: Record<z.infer<typeof NoteSectionKey>, string> = {
  overview: 'Overview',
  definition: 'Definition',
  why_it_matters: 'Why It Matters',
  core_concept: 'Core Concept',
  types: 'Types',
  working: 'Working',
  diagram: 'Diagram',
  advantages: 'Advantages',
  disadvantages: 'Disadvantages',
  applications: 'Applications',
  examples: 'Examples',
  exam_points: 'Exam Points',
  quick_revision: 'Quick Revision',
  common_mistakes: 'Common Mistakes',
  practice_questions: 'Practice Questions',
};

/**
 * Structured output contract for the Assessment Agent (Feature 5: hybrid
 * MCQ + short-answer assessments).
 *
 * MCQ and short-answer questions are different enough in shape (options +
 * literal correct answer vs. a model answer + grading rubric) that a
 * discriminated union on `type` is the right fit — it also means a short
 * -answer question can never accidentally be graded by literal string match,
 * since the two variants don't share a `correctAnswer` field at the type
 * level.
 */
const McqQuestionBaseSchema = z.object({
  question: z.string().min(1),
  type: z.literal('mcq'),
  options: z.array(z.string().min(1)).length(4, 'Provide exactly 4 options'),
  correctAnswer: z.string().min(1),
  explanation: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  concept: z.string().min(1),
});

/**
 * An MCQ is only gradable if its answer key is literally one of its options
 * (a model that returns "B" or a slightly reworded string would otherwise
 * score every student 0 on the question) and the options are distinct. A
 * failure here feeds the structured-generation retry loop, which sends the
 * message back to the model so it can repair its own output.
 */
function refineMcq(q: { options: string[]; correctAnswer: string }, ctx: z.RefinementCtx) {
  if (!q.options.includes(q.correctAnswer)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['correctAnswer'],
      message: 'correctAnswer must be copied exactly from one of the 4 options (not a letter like "B")',
    });
  }
  const normalized = q.options.map((o) => o.trim().toLowerCase());
  if (new Set(normalized).size !== normalized.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'The 4 options must all be different' });
  }
}

export const McqQuestionSchema = McqQuestionBaseSchema.superRefine(refineMcq);

export const ShortAnswerQuestionSchema = z.object({
  question: z.string().min(1),
  type: z.literal('short_answer'),
  // The reference answer + rubric are what the grading agent compares a
  // student's free-text response against — never shown to the student
  // before they submit (see app/api/assessment/[id]/route.ts).
  modelAnswer: z.string().min(1),
  rubric: z.string().min(1),
  maxMarks: z.number().int().min(1).max(20),
  explanation: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  concept: z.string().min(1),
});

export const AssessmentQuestionSchema = z
  .discriminatedUnion('type', [McqQuestionBaseSchema, ShortAnswerQuestionSchema])
  .superRefine((q, ctx) => {
    if (q.type === 'mcq') refineMcq(q, ctx);
  });

export const AssessmentQuestionsSchema = z.object({
  questions: z.array(AssessmentQuestionSchema).min(3, 'Generate at least 3 questions'),
});

export type McqQuestion = z.infer<typeof McqQuestionSchema>;
export type ShortAnswerQuestion = z.infer<typeof ShortAnswerQuestionSchema>;
export type AssessmentQuestion = z.infer<typeof AssessmentQuestionSchema>;
export type AssessmentQuestions = z.infer<typeof AssessmentQuestionsSchema>;

export const AssessmentDifficulty = z.enum(['easy', 'medium', 'hard', 'adaptive']);

/**
 * Structured output contract for the Mentor Agent. The agent produces the
 * summary and per-topic reasoning; the YouTube search link for each
 * recommendation is built deterministically from the topic name in the API
 * layer (never by the model, to avoid a hallucinated URL — see
 * lib/agents/mentor-agent.ts).
 */
export const MentorRecommendationSchema = z.object({
  summary: z.string().min(1),
  recommendations: z
    .array(
      z.object({
        topic: z.string().min(1),
        reason: z.string().min(1),
        action: z.string().min(1),
      })
    )
    .min(1)
    .max(5),
});

export type MentorRecommendation = z.infer<typeof MentorRecommendationSchema>;

/**
 * Input validation for the Settings page (Feature 2). Every field is
 * optional so a partial save (e.g. only the tutor's name changed) doesn't
 * require re-sending the whole form; `PATCH /api/settings` only writes the
 * keys present in the parsed body.
 */
export const SettingsUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  tutorDisplayName: z.string().trim().min(1, 'Tutor name cannot be empty').max(40).optional(),
  mentorDisplayName: z.string().trim().min(1, 'Mentor name cannot be empty').max(40).optional(),
  preferredDifficulty: z.enum(['easy', 'medium', 'hard', 'adaptive']).optional(),
  explanationStyle: z.enum(['beginner', 'normal', 'exam_focused', 'deep']).optional(),
  preferredLanguage: z.enum(['english', 'hindi', 'hinglish']).optional(),
  /** IANA timezone (e.g. Asia/Kolkata), synced from the browser. */
  timezone: z
    .string()
    .max(64)
    .refine((tz) => isValidTimezone(tz), 'Unknown timezone.')
    .optional(),
});

export type SettingsUpdate = z.infer<typeof SettingsUpdateSchema>;

/**
 * Structured output contract for LLM grading of a short-answer question
 * (Feature 5). The grading route validates every field, clamps `score`
 * server-side (never trusts the model's arithmetic blindly), and never
 * persists a result if the model's own maxScore disagrees with the
 * question's actual max_marks by more than rounding error — see
 * lib/agents/grading-agent.ts.
 */
export const ShortAnswerGradeSchema = z.object({
  score: z.number(),
  maxScore: z.number().positive(),
  feedback: z.string().min(1),
  strengths: z.array(z.string()).default([]),
  improvements: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
});

export type ShortAnswerGrade = z.infer<typeof ShortAnswerGradeSchema>;
