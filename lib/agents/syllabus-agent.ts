import { getVisionModel } from '@/lib/ai/gemini';
import { generateStructured } from '@/lib/ai/structured';
import { TopicAnalysisSchema, type TopicAnalysis } from '@/lib/validation/schemas';
import { SYLLABUS_AGENT_SYSTEM_PROMPT } from '@/prompts/syllabus';

interface AnalyzeTextInput {
  mode: 'text';
  text: string;
}

interface AnalyzeImageInput {
  mode: 'image';
  /** base64-encoded image bytes, no data: prefix */
  base64Image: string;
  mimeType: string;
}

export type SyllabusAgentInput = AnalyzeTextInput | AnalyzeImageInput;

const RESPONSE_SCHEMA_DESCRIPTION = `{
  "subject": string,
  "units": [
    { "name": string, "topics": [ { "name": string, "subtopics": string[] } ] }
  ]
}`;

/**
 * SYLLABUS_AGENT — internal id: SYLLABUS_AGENT.
 * Pure function: input in, validated TopicAnalysis out (or throws
 * StructuredGenerationError). Does not touch the database — the caller
 * (the /api/syllabus/analyze route) owns persistence.
 */
export async function runSyllabusAgent(input: SyllabusAgentInput): Promise<TopicAnalysis> {
  const model = getVisionModel({ temperature: 0.1 });

  const instruction = `Analyse the syllabus below and return a JSON object matching exactly this shape:\n${RESPONSE_SCHEMA_DESCRIPTION}`;

  if (input.mode === 'text') {
    return generateStructured(model, TopicAnalysisSchema, [
      ['system', SYLLABUS_AGENT_SYSTEM_PROMPT],
      [
        'user',
        `${instruction}\n\nSYLLABUS TEXT:\n"""\n${input.text}\n"""`,
      ],
    ]);
  }

  return generateStructured(model, TopicAnalysisSchema, [
    ['system', SYLLABUS_AGENT_SYSTEM_PROMPT],
    [
      'user',
      [
        { type: 'text', text: instruction },
        {
          type: 'media',
          mimeType: input.mimeType,
          data: input.base64Image,
        },
      ],
    ],
  ]);
}
