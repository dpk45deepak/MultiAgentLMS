import { headers } from 'next/headers';

/**
 * Structured (JSON-line) logging with a per-request id. The id is minted in
 * middleware.ts and returned to clients in the `x-request-id` response header,
 * so a user-reported error can be matched to a log line.
 *
 * Error reporting: set `errorReporter` (e.g. to Sentry.captureException) at
 * startup to forward errors to an external service. No vendor SDK is bundled.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

export type ErrorReporter = (error: unknown, context: Record<string, unknown>) => void;
let errorReporter: ErrorReporter | null = null;
export function setErrorReporter(reporter: ErrorReporter | null) {
  errorReporter = reporter;
}

export function getRequestId(): string | undefined {
  try {
    return headers().get('x-request-id') ?? undefined;
  } catch {
    return undefined; // outside a request scope (scripts, tests)
  }
}

function serialiseError(err: unknown) {
  if (err instanceof Error) return { name: err.name, message: err.message, stack: err.stack?.split('\n').slice(0, 6).join('\n') };
  return { message: String(err) };
}

function emit(level: Level, message: string, fields: Record<string, unknown> = {}) {
  const { error, ...rest } = fields;
  const line = {
    level,
    time: new Date().toISOString(),
    requestId: getRequestId(),
    message,
    ...rest,
    ...(error !== undefined ? { error: serialiseError(error) } : {}),
  };
  const out = JSON.stringify(line);
  if (level === 'error') console.error(out);
  else if (level === 'warn') console.warn(out);
  else console.log(out);

  if (level === 'error' && errorReporter && error !== undefined) {
    try {
      errorReporter(error, { message, requestId: line.requestId, ...rest });
    } catch {
      /* never let reporting break a request */
    }
  }
}

export const logger = {
  debug: (message: string, fields?: Record<string, unknown>) => emit('debug', message, fields),
  info: (message: string, fields?: Record<string, unknown>) => emit('info', message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => emit('warn', message, fields),
  error: (message: string, fields?: Record<string, unknown>) => emit('error', message, fields),
};
