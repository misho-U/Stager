/** Where to land after signing in when no `next` parameter was supplied. */
export const DEFAULT_REDIRECT = '/admin';

/**
 * Only same-site, absolute-path redirects are followed.
 *
 * Rejects `//evil.com` (protocol-relative) and `https://evil.com` alike — an
 * attacker who can seed a link to our own login page must not be able to bounce
 * the admin somewhere else once they authenticate.
 */
export function safeRedirectTarget(next: string | null): string {
  if (!next) return DEFAULT_REDIRECT;
  if (!next.startsWith('/')) return DEFAULT_REDIRECT;
  if (next.startsWith('//')) return DEFAULT_REDIRECT;
  return next;
}
