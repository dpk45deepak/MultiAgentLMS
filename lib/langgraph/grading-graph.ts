import { StateGraph, END, START } from '@langchain/langgraph';
import { GradingState, type GradingStateType } from './state';
import { runGradingAgent } from '@/lib/agents/grading-agent';

/**
 * Orchestrates short-answer grading:
 *
 *   START -> gradingAgent -> END
 *
 * A single-node graph, kept as a graph for the same reason as
 * assessment-generation-graph: consistency with the rest of the codebase's
 * per-feature-graph convention, and a seam for a future node (e.g. a
 * second-opinion re-grade on low-confidence results) without touching the
 * route handler.
 *
 * Never throws: a failed grading call surfaces as `error` in the returned
 * state so the submit route can record grading_status = 'failed' for that
 * answer instead of losing the whole attempt.
 */
async function gradingAgentNode(state: GradingStateType) {
  try {
    const grade = await runGradingAgent({
      question: state.question,
      studentAnswer: state.studentAnswer,
      modelAnswer: state.modelAnswer,
      rubric: state.rubric,
      maxMarks: state.maxMarks,
      language: state.language,
    });
    return { grade };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not grade this answer.' };
  }
}

const graph = new StateGraph(GradingState)
  .addNode('gradingAgent', gradingAgentNode)
  .addEdge(START, 'gradingAgent')
  .addEdge('gradingAgent', END);

export const gradingGraph = graph.compile();
