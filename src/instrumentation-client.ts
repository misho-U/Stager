import { MONITORING_ON, SENTRY_OPTIONS } from '@pkg/monitoring/options';

/**
 * Starts Sentry in the browser, when error reporting is on. Loaded after the
 * page, in its own file: a visitor never waits for it, and without a DSN never
 * downloads it.
 */
if (MONITORING_ON) {
  void import('@sentry/nextjs').then((Sentry) => Sentry.init(SENTRY_OPTIONS));
}
