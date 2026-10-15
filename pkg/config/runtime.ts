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
 * True inside `next build`, where the public pages are prerendered from the
 * database by several workers at once (pkg/db/prisma.ts sizes the pool for it).
 */
export const IS_BUILD = process.env.NEXT_PHASE === 'phase-production-build';

/**
 * Host of the current Vercel deployment, without a scheme. Set automatically by
 * Vercel and absent locally. On preview deployments this differs from the
 * configured site URL, so pkg/security/request.ts accepts it as an origin too.
 */
export const VERCEL_URL = process.env.VERCEL_URL ?? null;
