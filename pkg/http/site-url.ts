import { SITE_ORIGIN } from '@pkg/config/env.client';
import { INTERNAL_API_ORIGIN, VERCEL_URL } from '@pkg/config/runtime';

/**
 * Origin the SERVER uses to call this app's own /api routes.
 *
 * Deliberately not the public domain. Server components fetch their own API,
 * and `fetch` on the server needs an absolute URL — but the host that serves
 * visitors and the host the server can reach are different questions:
 *
 *   1. INTERNAL_API_ORIGIN — an explicit override, e.g. a loopback address.
 *   2. VERCEL_URL — the deployment actually serving this request. Set in every
 *      Vercel environment, so a domain whose DNS has not propagated yet (or is
 *      not configured at all) never breaks server-side rendering, and a preview
 *      fetches itself rather than production.
 *   3. NEXT_PUBLIC_SITE_URL — local development, and any non-Vercel host.
 *
 * The practical consequence: NEXT_PUBLIC_SITE_URL can be set to the final
 * domain before that domain resolves. It is read for canonical and OG URLs,
 * which are strings in the markup, not requests anybody makes during a build.
 */
export function getSiteOrigin(): string {
  if (INTERNAL_API_ORIGIN) return INTERNAL_API_ORIGIN.replace(/\/$/, '');
  if (VERCEL_URL) return `https://${VERCEL_URL}`;
  return SITE_ORIGIN;
}

/** Joins a `/api/...` path onto the current origin. */
export function toAbsoluteUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${getSiteOrigin()}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Canonical, user-facing URL — always the configured domain, never VERCEL_URL. */
export function toCanonicalUrl(path: string): string {
  return `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}
