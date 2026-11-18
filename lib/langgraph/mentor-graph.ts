import { StateGraph, END, START } from '@langchain/langgraph';
import type { RunnableConfig } from '@langchain/core/runnables';
import { MentorState, type MentorStateType } from './state';
import { runMentorAgent } from '@/lib/agents/mentor-agent';
import type { PerformanceBreakdown } from '@/lib/agents/performance-agent';

/**
 * Orchestrates the mentor flow:
 *
 *   START -> performanceAnalysis -> contextRetrieval -> mentorAgent -> END
 *
 * Both performanceAnalysis and contextRetrieval read the database through
 * injected functions (same dependency-injection pattern used throughout
 * this codebase), so this graph never imports Supabase directly and can be
 * unit-tested with fake data for both.
 */

interface MentorGraphConfigurable {
  computePerformance: (userId: string) => Promise<PerformanceBreakdown>;
  fetchLearnerContext: (userId: string) => Promise<string[]>;
  /** Feature 6. Optional so existing callers/tests that don't pass it keep working unchanged. */
  fetchRecentTutorQuestions?: (userId: string) => Promise<string[]>;
}

async function performanceAnalysis(state: MentorStateType, config: RunnableConfig) {
  const computePerformance = (config.configurable as Partial<MentorGraphConfigurable> | undefined)
    ?.computePerformance;
  if (!computePerformance) {
    return { performance: { strong: [], moderate: [], weak: [], hasData: false } };
  }
  const performance = await computePerformance(state.userId);
  return { performance };
}

async function contextRetrieval(state: MentorStateType, config: RunnableConfig) {
  const configurable = config.configurable as Partial<MentorGraphConfigurable> | undefined;
  const fetchLearnerContext = configurable?.fetchLearnerContext;
  const fetchRecentTutorQuestions = configurable?.fetchRecentTutorQuestions;

  const [learnerContext, recentTutorQuestions] = await Promise.all([
    fetchLearnerContext ? fetchLearnerContext(state.userId).catch(() => []) : Promise.resolve([]),
    fetchRecentTutorQuestions ? fetchRecentTutorQuestions(state.userId).catch(() => []) : Promise.resolve([]),
  ]);

  return { learnerContext, recentTutorQuestions };
}

async function mentorAgentNode(state: MentorStateType) {
  try {
    const recommendation = await runMentorAgent({
      performance: state.performance ?? { strong: [], moderate: [], weak: [], hasData: false },
      learnerContext: state.learnerContext,
      recentTutorQuestions: state.recentTutorQuestions,
      mentorDisplayName: state.mentorDisplayName,
      language: state.language,
    });
    return { recommendation };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'The mentor could not produce a recommendation.' };
  }
}

const graph = new StateGraph(MentorState)
  .addNode('performanceAnalysis', performanceAnalysis)
  .addNode('contextRetrieval', contextRetrieval)
  .addNode('mentorAgent', mentorAgentNode)
  .addEdge(START, 'performanceAnalysis')
  .addEdge('performanceAnalysis', 'contextRetrieval')
  .addEdge('contextRetrieval', 'mentorAgent')
  .addEdge('mentorAgent', END);

export const mentorGraph = graph.compile();
export type { MentorGraphConfigurable };
