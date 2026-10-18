import type { Breadcrumb, ErrorEvent } from '@sentry/nextjs';

import { DEPLOY_ENV, SENTRY_DSN } from '@pkg/config/env.client';
import { IS_PRODUCTION, NODE_ENV } from '@pkg/config/runtime';
import { redactText, redactValue } from '@pkg/monitoring/redact';

/**
 * Error reporting to Sentry: on when a DSN is set, and never in `pnpm dev`,
 * whose errors are a developer's own and would bury the real ones.
 */
export const MONITORING_ON = SENTRY_DSN !== null && IS_PRODUCTION;

/** The request headers an event keeps; cookies and credentials never leave. */
const KEPT_HEADERS = new Set(['user-agent', 'referer', 'accept-language', 'content-type']);

const withoutQuery = (url: string) => url.split('?')[0] ?? url;

/**
 * A breadcrumb's addresses lose their query string too: a navigation records
 * the page it came from and went to, and a query can carry an email address.
 * Its text (a logged line, a console message) loses addresses and numbers.
 */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  const { data } = breadcrumb;
  if (data) {
    for (const key of ['from', 'to', 'url']) {
      if (typeof data[key] === 'string') data[key] = withoutQuery(data[key]);
    }
    breadcrumb.data = redactValue(data) as Breadcrumb['data'];
  }
  if (breadcrumb.message) breadcrumb.message = redactText(breadcrumb.message);
  return breadcrumb;
}

/**
 * What reaches Sentry from an event, and what does not: no cookies, no
 * request body (an inquiry is personal data), no query string anywhere (it
 * can carry an address), of the user at most an id, and no email address or
 * phone number in the event's own words (its message, its exceptions, its
 * extra data), which can quote what a visitor typed.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  event.breadcrumbs = event.breadcrumbs?.map(scrubBreadcrumb);
  if (event.message) event.message = redactText(event.message);
  if (event.logentry) event.logentry = redactValue(event.logentry) as ErrorEvent['logentry'];
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = redactText(exception.value);
  }
  if (event.extra) event.extra = redactValue(event.extra) as ErrorEvent['extra'];
  const { request } = event;
  if (request) {
    delete request.cookies;
    delete request.data;
    delete request.query_string;
    if (request.url) request.url = withoutQuery(request.url);
    if (request.headers) {
      request.headers = Object.fromEntries(
        Object.entries(request.headers).filter(([name]) => KEPT_HEADERS.has(name.toLowerCase())),
      );
    }
  }
  if (event.user) event.user = event.user.id ? { id: event.user.id } : {};
  return event;
}

/** The same settings in the browser, on the server and on Edge. */
export const SENTRY_OPTIONS = {
  dsn: SENTRY_DSN ?? undefined,
  enabled: MONITORING_ON,
  environment: DEPLOY_ENV ?? NODE_ENV,
  sendDefaultPii: false,
  // Errors only: no performance tracing, no session replay.
  tracesSampleRate: 0,
  beforeSend: scrubEvent,
  beforeBreadcrumb: scrubBreadcrumb,
};
