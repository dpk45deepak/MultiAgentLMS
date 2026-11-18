/** Message used when every configured AI provider failed or is cooling down. */
export const AI_BUSY_MESSAGE = 'The AI service is busy right now. Please try again in a moment.';

/** 503 (try again soon) when the AI was unavailable, 502 for any other upstream failure. */
export function aiErrorStatus(message: string | null | undefined): 502 | 503 {
  return message === AI_BUSY_MESSAGE ? 503 : 502;
}
