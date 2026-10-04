import type { Instrumentation } from 'next';

import { NEXT_RUNTIME } from '@pkg/config/runtime';
import { MONITORING_ON, SENTRY_OPTIONS } from '@pkg/monitoring/options';

/**
 * Starts Sentry on the server and on Edge, when error reporting is on
 * (pkg/monitoring/options.ts). Without a DSN, nothing of it is even loaded.
 */
export async function register() {
  if (!MONITORING_ON || !NEXT_RUNTIME) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.init(SENTRY_OPTIONS);
}

/**
 * An error Next caught while rendering or routing: a server component, a page,
 * the proxy. Route handlers catch their own and report them in
 * handleRouteError.
 */
export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!MONITORING_ON) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(...args);
};
