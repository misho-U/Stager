import { IS_PRODUCTION } from '@pkg/config/runtime';

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
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  const line = JSON.stringify(entry);

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else if (level === 'debug') {
    if (!IS_PRODUCTION) console.warn(line);
  } else {
    console.warn(line);
  }
}

/** Reduces an unknown thrown value to something safe to serialise. */
export function serialiseError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { name: 'UnknownError', message: String(error) };
}

export const logger = {
  debug: (message: string, context?: LogContext) => write('debug', message, context),
  info: (message: string, context?: LogContext) => write('info', message, context),
  warn: (message: string, context?: LogContext) => write('warn', message, context),
  error: (message: string, context?: LogContext) => write('error', message, context),
};
