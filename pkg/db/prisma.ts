import 'server-only';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import type { PoolConfig } from 'pg';

import { isProduction, serverEnv } from '@pkg/config/env.server';
import { IS_BUILD } from '@pkg/config/runtime';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

/**
 * TLS for the database connection.
 *
 * node-postgres speaks plain text unless told otherwise, and the connection
 * string Supabase hands out carries no `sslmode`, so every query and every
 * inquiry (names, emails, phone numbers) crossed the internet unencrypted.
 * A remote database is now reached over TLS. With DATABASE_SSL_CA set the
 * server's certificate is verified too; without it the link is encrypted but
 * the server is not authenticated. A local Postgres (development, CI) speaks
 * no TLS and gets none.
 *
 * Leave `sslmode` out of DATABASE_URL: node-postgres lets a connection string
 * override this setting.
 */
export function databaseSsl(url: string): PoolConfig['ssl'] {
  if (serverEnv.DATABASE_SSL === 'off') return false;

  let host: string;
  try {
    host = new URL(url).hostname.replace(/^\[|\]$/g, '');
  } catch {
    return false;
  }
  if (LOCAL_HOSTS.has(host)) return false;

  const ca = serverEnv.DATABASE_SSL_CA?.replace(/\\n/g, '\n');
  return ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false };
}

/**
 * The single Prisma client for the whole app.
 *
 * Only `src/app/api/**` and the published read layer (`src/server/published`)
 * may import this — enforced by ESLint (`@typescript-eslint/no-restricted-imports`
 * in eslint.config.mjs). The browser and the dashboard reach data through an
 * entity `.api.ts` that calls those routes.
 *
 * Prisma 7 requires a driver adapter; we use node-postgres against the POOLED
 * Supabase URL, at run time and in `next build` alike (DIRECT_URL is only for
 * migrations). The pool is sized HERE: `connection_limit` and `pgbouncer` in
 * the URL were settings of Prisma's old engine, and node-postgres ignores them,
 * so every instance used to keep up to 10 connections and wait forever for one.
 * Here `max` is the old `connection_limit`, and `connectionTimeoutMillis` (with
 * the transaction `maxWait` below) the old `pool_timeout`.
 *
 * Build and run time differ on purpose. A function serves one request at a
 * time and must fail fast; `next build` prerenders many pages per worker at
 * once on a pool of two, so a query there may queue behind the others, and
 * that wait is not an outage.
 */
const POOL = IS_BUILD
  ? {
      // Workers × 2 is the build's whole share of the pooler: with
      // `experimental.cpus` capped in next.config.ts, at most 8 connections.
      max: 2,
      // Queue for a free connection instead of failing the build after 5s.
      connectionTimeoutMillis: 30_000,
      // findUnique calls made in the same tick (the layout's site settings
      // for ka and en, several pages' lookups) run as ONE batch inside a
      // transaction. Prisma's defaults give it 2s to get a connection and
      // BEGIN, and 5s in all, with each statement in it one round trip after
      // another: a busy build worker on a far pooler missed the first and
      // failed with P2028 ("Unable to start a transaction in the given time").
      transactionOptions: { maxWait: 30_000, timeout: 60_000 },
    }
  : {
      // A few per instance is plenty for this site, and the pooler's client
      // limit is shared by every instance and every preview.
      max: 5,
      // Fail in seconds, not at the function's time limit, when the database
      // is unreachable or the pool is exhausted: the page then says it failed.
      connectionTimeoutMillis: 5_000,
      // Prisma's defaults (maxWait 2s, timeout 5s), unchanged at run time.
      transactionOptions: undefined,
    };

const createPrismaClient = () => {
  const adapter = new PrismaPg({
    connectionString: serverEnv.DATABASE_URL,
    ssl: databaseSsl(serverEnv.DATABASE_URL),
    max: POOL.max,
    // Idle connections go quickly: a suspended instance should not hold any.
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: POOL.connectionTimeoutMillis,
  });

  return new PrismaClient({
    adapter,
    log: isProduction ? ['error'] : ['warn', 'error'],
    transactionOptions: POOL.transactionOptions,
  });
};

// In development Next.js clears the module registry on every hot reload, which
// would otherwise open a new pool per edit until the database refuses more
// connections. Stash the client on globalThis so reloads reuse it.
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}
