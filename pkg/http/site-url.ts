import { SITE_ORIGIN } from '@pkg/config/env.client';
import { VERCEL_URL } from '@pkg/config/runtime';

/**
 * Absolute origin for this deployment.
 *
 * Server components fetch their own /api routes, and `fetch` on the server
 * needs an absolute URL. On Vercel preview deployments the public site URL is
 * not the URL actually serving the request, so VERCEL_URL wins there.
 */
export function getSiteOrigin(): string {
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
