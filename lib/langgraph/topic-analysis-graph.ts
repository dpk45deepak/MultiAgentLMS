import { StateGraph, END, START } from '@langchain/langgraph';
import { TopicAnalysisState, type TopicAnalysisStateType } from './state';
import { runSyllabusAgent } from '@/lib/agents/syllabus-agent';
import { AllProvidersFailedError } from '@/lib/ai/fallback-model';

/**
 * Orchestrates the "analyse syllabus" product flow:
 *
 *   START -> classifyInput -> syllabusAgent -> END
 *
 * This graph only has one real worker node today (SYLLABUS_AGENT). It's
 * still expressed as a graph rather than a plain function call because the
 * product flow diagram treats "request classification" as a distinct step,
 * and because it gives us one seam to later insert a "check for existing
 * topics to avoid duplicate generation" node (requirement #33, AI cost
 * control) without changing the route handler that calls this graph.
 */

async function classifyInput(state: TopicAnalysisStateType) {
  if (state.input.mode === 'text' && state.input.text.trim().length === 0) {
    return { error: 'Syllabus text was empty.' };
  }
  if (state.input.mode === 'image' && !state.input.base64Image) {
    return { error: 'No image data was provided.' };
  }
  return {};
}

async function syllabusAgentNode(state: TopicAnalysisStateType) {
  if (state.error) return {};
  try {
    const result = await runSyllabusAgent(state.input);
    return { result };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Syllabus analysis failed.',
      errorKind: err instanceof AllProvidersFailedError ? ('busy' as const) : undefined,
    };
  }
}

const graph = new StateGraph(TopicAnalysisState)
  .addNode('classifyInput', classifyInput)
  .addNode('syllabusAgent', syllabusAgentNode)
  .addEdge(START, 'classifyInput')
  .addEdge('classifyInput', 'syllabusAgent')
  .addEdge('syllabusAgent', END);

export const topicAnalysisGraph = graph.compile();
