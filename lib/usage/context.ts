import { AsyncLocalStorage } from 'node:async_hooks';

export interface UsageContext {
  userId: string;
  feature: string;
}

const storage = new AsyncLocalStorage<UsageContext>();

/**
 * Attaches the user + feature to the rest of the current async execution, so
 * every LLM call made below (agents, graphs, streams) is attributed to them
 * without threading ids through every function signature. Call it right after
 * the route has verified the user.
 */
export function setUsageContext(context: UsageContext) {
  storage.enterWith(context);
}

export function getUsageContext(): UsageContext | undefined {
  return storage.getStore();
}
