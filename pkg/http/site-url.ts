import { SITE_ORIGIN } from '@pkg/config/env.client';

/**
 * Canonical, user-facing URL — always the configured domain, never VERCEL_URL.
 *
 * A string in the markup (canonical tags, OG URLs, the sitemap), never a
 * request anybody makes during a build, so NEXT_PUBLIC_SITE_URL can name the
 * final domain before its DNS resolves.
 */
export function toCanonicalUrl(path: string): string {
  return `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}
