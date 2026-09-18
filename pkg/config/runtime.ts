/**
 * Runtime flags that are safe everywhere — server, client and Edge.
 *
 * `NODE_ENV` is the one env var that needs no validation: Next.js guarantees it
 * and inlines it at build time. Everything else goes through env.client.ts or
 * env.server.ts, which validate.
 */
export const NODE_ENV = process.env.NODE_ENV ?? 'development';

export const IS_PRODUCTION = NODE_ENV === 'production';
export const IS_DEVELOPMENT = NODE_ENV === 'development';
export const IS_TEST = NODE_ENV === 'test';

/**
 * Host of the current Vercel deployment, without a scheme. Set automatically by
 * Vercel and absent locally. On preview deployments this differs from the
 * configured site URL, which matters when the server fetches its own API.
 */
export const VERCEL_URL = process.env.VERCEL_URL ?? null;
