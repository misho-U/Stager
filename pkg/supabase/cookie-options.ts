import type { CookieOptionsWithName } from '@supabase/ssr';

import { IS_DEVELOPMENT } from '@pkg/config/runtime';

/**
 * How the Supabase session cookies are set.
 *
 * Only the server ever reads them: sign-in, sign-out and every admin request
 * go through our own routes, and no browser-side Supabase client exists. So
 * they are HttpOnly, out of reach of any script that ever gets onto a page
 * (public pages allow inline scripts, see pkg/security/csp.ts), and Secure,
 * never sent over plain HTTP. @supabase/ssr's defaults are neither.
 *
 * `next dev` serves plain HTTP, where a browser refuses a Secure cookie except
 * on localhost; development drops the flag so a LAN address still works.
 */
export const SESSION_COOKIE_OPTIONS: CookieOptionsWithName = {
  httpOnly: true,
  secure: !IS_DEVELOPMENT,
  sameSite: 'lax',
  path: '/',
};
