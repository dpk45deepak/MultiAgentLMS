import { StateGraph, END, START } from '@langchain/langgraph';
import type { RunnableConfig } from '@langchain/core/runnables';
import { NotesGenerationState, type NotesGenerationStateType } from './state';
import { runNotesAgent } from '@/lib/agents/notes-agent';
import { StructuredGenerationError } from '@/lib/ai/structured';

/**
 * Orchestrates the "generate notes" product flow:
 *
 *   START -> contextRetrieval -> notesAgent -> END
 *
 * contextRetrieval calls back into the database through a function injected
 * at invoke-time (config.configurable.fetchLearnerContext) rather than
 * importing the Supabase client directly. That keeps this graph a pure,
 * unit-testable orchestration layer — tests can invoke it with a fake
 * context function and never touch a real database (see
 * tests/notes-agent.test.ts).
 */

interface NotesGraphConfigurable {
  fetchLearnerContext: (userId: string, topic: string) => Promise<string[]>;
}

async function contextRetrieval(state: NotesGenerationStateType, config: RunnableConfig) {
  const fetchLearnerContext = (config.configurable as Partial<NotesGraphConfigurable> | undefined)
    ?.fetchLearnerContext;
  if (!fetchLearnerContext) return { learnerContext: [] };

  try {
    const context = await fetchLearnerContext(state.userId, state.topic);
    return { learnerContext: context };
  } catch {
    // Learner context is an enhancement, not a requirement — proceed without it.
    return { learnerContext: [] };
  }
}

async function notesAgentNode(state: NotesGenerationStateType) {
  try {
    const notes = await runNotesAgent({
      subject: state.subject,
      topic: state.topic,
      subtopics: state.subtopics,
      learnerContext: state.learnerContext,
      language: state.language,
    });
    return { notes };
  } catch (err) {
    console.error('NOTES_AGENT failed', {
      topic: state.topic,
      error: err instanceof Error ? err.message : String(err),
      cause: err instanceof StructuredGenerationError ? err.cause : undefined,
    });
    return { error: err instanceof Error ? err.message : 'Notes generation failed.' };
  }
}

const graph = new StateGraph(NotesGenerationState)
  .addNode('contextRetrieval', contextRetrieval)
  .addNode('notesAgent', notesAgentNode)
  .addEdge(START, 'contextRetrieval')
  .addEdge('contextRetrieval', 'notesAgent')
  .addEdge('notesAgent', END);

export const notesGenerationGraph = graph.compile();
export type { NotesGraphConfigurable };
