import { StateGraph, END, START } from '@langchain/langgraph';
import type { RunnableConfig } from '@langchain/core/runnables';
import { TutorChatState, type TutorChatStateType } from './state';
import { runTutorAgent } from '@/lib/agents/tutor-agent';
import type { TutorChatTurn } from '@/lib/agents/tutor-agent';

/**
 * Orchestrates the "ask the tutor" flow:
 *
 *   START -> contextRetrieval -> tutorAgent -> END
 *
 * contextRetrieval loads short-term memory (the session's recent messages)
 * through an injected function, exactly like notes-generation-graph injects
 * long-term-memory retrieval. Same reasoning: keeps this graph DB-free and
 * unit-testable with a fake history.
 */

interface TutorGraphConfigurable {
  fetchRecentHistory: (sessionId: string) => Promise<TutorChatTurn[]>;
}

async function contextRetrieval(state: TutorChatStateType, config: RunnableConfig) {
  const fetchRecentHistory = (config.configurable as Partial<TutorGraphConfigurable> | undefined)
    ?.fetchRecentHistory;
  if (!fetchRecentHistory) return { history: [] };

  try {
    const history = await fetchRecentHistory(state.sessionId);
    return { history };
  } catch {
    return { history: [] };
  }
}

async function tutorAgentNode(state: TutorChatStateType) {
  try {
    const reply = await runTutorAgent({
      topicName: state.topicName,
      subjectName: state.subjectName,
      mode: state.mode,
      tutorDisplayName: state.tutorDisplayName,
      history: state.history,
      message: state.message,
      language: state.language,
    });
    return { reply };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'The tutor could not respond right now.' };
  }
}

const graph = new StateGraph(TutorChatState)
  .addNode('contextRetrieval', contextRetrieval)
  .addNode('tutorAgent', tutorAgentNode)
  .addEdge(START, 'contextRetrieval')
  .addEdge('contextRetrieval', 'tutorAgent')
  .addEdge('tutorAgent', END);

export const tutorChatGraph = graph.compile();
export type { TutorGraphConfigurable };
