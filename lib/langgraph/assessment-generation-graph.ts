import { StateGraph, END, START } from '@langchain/langgraph';
import { AssessmentGenerationState, type AssessmentGenerationStateType } from './state';
import { runAssessmentAgent } from '@/lib/agents/assessment-agent';

/**
 * Orchestrates question generation:
 *
 *   START -> assessmentAgent -> END
 *
 * A single-node graph, kept as a graph (rather than a bare function call)
 * for the same reason as topic-analysis-graph: it's the seam where a future
 * "avoid repeating questions already asked this week" node would go,
 * without changing the route handler.
 */

async function assessmentAgentNode(state: AssessmentGenerationStateType) {
  try {
    const questions = await runAssessmentAgent({
      subject: state.subject,
      topic: state.topic,
      difficulty: state.difficulty,
      mcqCount: state.mcqCount,
      shortAnswerCount: state.shortAnswerCount,
      language: state.language,
      knownConcepts: state.knownConcepts,
    });
    return { questions };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not generate an assessment.' };
  }
}

const graph = new StateGraph(AssessmentGenerationState)
  .addNode('assessmentAgent', assessmentAgentNode)
  .addEdge(START, 'assessmentAgent')
  .addEdge('assessmentAgent', END);

export const assessmentGenerationGraph = graph.compile();
