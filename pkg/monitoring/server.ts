import 'server-only';

import type * as SentrySdk from '@sentry/nextjs';
import { after } from 'next/server';

import { withheldPrismaError } from '@pkg/db/errors';
import { MONITORING_ON } from '@pkg/monitoring/options';

type Context = Record<string, unknown>;

/**
 * Sends an event to Sentry from the server, when reporting is on, and keeps
 * the function alive until it has gone: Vercel freezes a function once it has
 * answered, and an event still queued then is lost.
 */
function send(capture: (Sentry: typeof SentrySdk) => void): void {
  if (!MONITORING_ON) return;
  const sending = import('@sentry/nextjs')
    .then(async (Sentry) => {
      capture(Sentry);
      await Sentry.flush(2000);
    })
    .catch(() => undefined);
  try {
    after(() => sending);
  } catch {
    // Outside a request (nothing to keep alive): it sends on its own.
  }
}

/**
 * A thrown error, with its stack: grouped in Sentry by where it came from. A
 * database error goes by its code and model, never its message, which
 * quotes the values of the query that failed.
 */
export function reportServerError(error: unknown, context?: Context): void {
  const reported = withheldPrismaError(error);
  send((Sentry) => Sentry.captureException(reported, context ? { extra: context } : undefined));
}

/** A logged failure (logger.error): grouped in Sentry by its event name. */
export function reportServerEvent(name: string, context?: Context): void {
  send((Sentry) =>
    Sentry.captureMessage(name, { level: 'error', fingerprint: [name], extra: context }),
  );
}
