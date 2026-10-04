import { MONITORING_ON } from '@pkg/monitoring/options';

/**
 * Sends a caught error to Sentry, when reporting is on. The SDK is loaded
 * only then, so a page without a DSN never downloads it.
 *
 * For the browser (error boundaries). Server code uses reportServerError
 * (pkg/monitoring/server.ts), which also keeps the function alive until the
 * event is sent.
 */
export function reportError(error: unknown): void {
  if (!MONITORING_ON) return;
  void import('@sentry/nextjs')
    .then((Sentry) => Sentry.captureException(error))
    .catch(() => undefined);
}
