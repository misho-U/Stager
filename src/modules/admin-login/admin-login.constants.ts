/** Where to land after signing in when no `next` parameter was supplied. */
export const DEFAULT_REDIRECT = '/admin';

/** A placeholder origin to resolve `next` against; `.invalid` never resolves. */
const BASE = 'https://dashboard.invalid';

/**
 * Where to go after signing in: a dashboard page, and nothing else.
 *
 * An attacker who can seed a link to our own login page must not be able to
 * bounce the admin somewhere else once they authenticate. Checking the string
 * by hand missed `/\evil.com`, which browsers read as `//evil.com`, another
 * host. So `next` is resolved the way the browser would resolve it, and kept
 * only if it lands on this origin, under /admin (and not back on the login
 * page). What is followed is the resolved path, never the raw string.
 */
export function safeRedirectTarget(next: string | null): string {
  if (!next) return DEFAULT_REDIRECT;

  let url: URL;
  try {
    url = new URL(next, BASE);
  } catch {
    return DEFAULT_REDIRECT;
  }

  if (url.origin !== BASE) return DEFAULT_REDIRECT;
  if (url.pathname !== '/admin' && !url.pathname.startsWith('/admin/')) return DEFAULT_REDIRECT;
  if (url.pathname === '/admin/login' || url.pathname.startsWith('/admin/login/')) {
    return DEFAULT_REDIRECT;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
