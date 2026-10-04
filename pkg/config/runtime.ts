/**
 * Runtime flags that are safe everywhere — server, client and Edge.
 *
 * `NODE_ENV` is the one env var that needs no validation: Next.js guarantees it
 * and inlines it at build time. Everything else goes through env.client.ts or
 * env.server.ts, which validate.
 */
export const NODE_ENV = process.env.NODE_ENV ?? 'development';

export const IS_PRODUCTION = NODE_ENV === 'production';

/** `nodejs` or `edge` on the server, unset in the browser: which runtime this code runs in. */
export const NEXT_RUNTIME = process.env.NEXT_RUNTIME ?? null;
export const IS_DEVELOPMENT = NODE_ENV === 'development';

/**
 * Host of the current Vercel deployment, without a scheme. Set automatically by
 * Vercel and absent locally. On preview deployments this differs from the
 * configured site URL, which matters when the server fetches its own API.
 */
export const VERCEL_URL = process.env.VERCEL_URL ?? null;

/**
 * Explicit origin for the server's own /api calls, overriding everything else.
 *
 * Server components fetch this app's API over HTTP, so they need an origin that
 * resolves from inside the server — which is not the same requirement as the
 * public, user-facing domain:
 *
 *   - a domain whose DNS has not propagated yet resolves for nobody, including
 *     us, so the site would render empty until it did;
 *   - a Vercel preview with Deployment Protection turned on answers 401 to an
 *     unauthenticated request, including our own.
 *
 * Set this to a loopback origin (`http://127.0.0.1:3000`) to take the public
 * domain out of the path entirely. Left unset, the defaults in
 * pkg/http/site-url.ts already avoid the public domain on Vercel.
 *
 * Server-only by design: it has no NEXT_PUBLIC_ prefix, so it is `undefined` in
 * the browser, where nothing needs it — client fetches use relative paths.
 */
export const INTERNAL_API_ORIGIN = process.env.INTERNAL_API_ORIGIN ?? null;

/**
 * Set by Vercel when the project's "Protection Bypass for Automation" is on.
 * With Deployment Protection, Vercel answers 401 to a deployment fetching its
 * own URL unless the request carries this, and every public read would fail.
 * Server-side only: it is not NEXT_PUBLIC, so client bundles see undefined.
 */
export const VERCEL_AUTOMATION_BYPASS_SECRET = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? null;
