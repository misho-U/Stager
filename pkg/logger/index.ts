import { IS_PRODUCTION } from '@pkg/config/runtime';
import { reportServerEvent } from '@pkg/monitoring/server';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

/**
 * Structured logger.
 *
 * One JSON line per event so Vercel's log drain can parse it. Never log a
 * request body, an auth token, or a raw IP address — inquiries store a salted
 * hash of the IP precisely so the raw value never needs to exist in a log.
 */
function write(level: LogLevel, message: string, context?: LogContext) {
  // The event's own fields last, so nothing in `context` can overwrite them:
  // an error's `message` used to replace the event name (`api.unhandled_error`
  // became "fetch failed"), which made the line impossible to search for.
  const entry = {
    ...context,
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  const line = JSON.stringify(entry);

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else if (level === 'debug' && IS_PRODUCTION) {
    return;
  } else {
    // Routine events at info level, so Vercel does not list them as warnings.
    // eslint-disable-next-line no-console -- the logger is the one place that writes
    console.info(line);
  }
}

type SerialisedError = {
  name: string;
  message: string;
  code?: string;
  status?: number;
  stack?: string;
  cause?: SerialisedError;
};

function describeError(error: unknown, depth: number): SerialisedError {
  if (!(error instanceof Error)) return { name: 'UnknownError', message: String(error) };

  const extra = error as Error & { code?: unknown; status?: unknown };
  return {
    name: error.name,
    message: error.message,
    // Prisma's P2002, Node's ECONNREFUSED, an HTTP status: what to search for.
    ...(typeof extra.code === 'string' ? { code: extra.code } : {}),
    ...(typeof extra.status === 'number' ? { status: extra.status } : {}),
    stack: error.stack,
    // "fetch failed" says nothing on its own; its cause says why.
    ...(error.cause !== undefined && depth < 2
      ? { cause: describeError(error.cause, depth + 1) }
      : {}),
  };
}

/**
 * Reduces an unknown thrown value to something safe to serialise, under an
 * `error` key: spread it into a log context (`...serialiseError(e)`) and the
 * event keeps its own name and fields.
 */
export function serialiseError(error: unknown): { error: SerialisedError } {
  return { error: describeError(error, 0) };
}

export const logger = {
  debug: (message: string, context?: LogContext) => write('debug', message, context),
  info: (message: string, context?: LogContext) => write('info', message, context),
  warn: (message: string, context?: LogContext) => write('warn', message, context),
  /**
   * Something failed that someone should look at: also sent to Sentry, when
   * it is set up, grouped by the event name. `report: false` where the caller
   * reports the error itself, with its stack (handleRouteError).
   */
  error: (message: string, context?: LogContext, { report = true }: { report?: boolean } = {}) => {
    write('error', message, context);
    if (report) reportServerEvent(message, context);
  },
};
