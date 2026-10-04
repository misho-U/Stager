import 'server-only';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import type { PoolConfig } from 'pg';

import { isProduction, serverEnv } from '@pkg/config/env.server';

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
 * Only `src/app/api/**` may import this — enforced by ESLint
 * (`@typescript-eslint/no-restricted-imports` in eslint.config.mjs). Everything
 * else reaches data through an entity `.api.ts` that calls those routes, so
 * there is exactly one place where a query can be written.
 *
 * Prisma 7 requires a driver adapter; we use node-postgres against the POOLED
 * Supabase URL. The pool is sized HERE: `connection_limit` and `pgbouncer` in
 * the URL were settings of Prisma's old engine, and node-postgres ignores them,
 * so every instance used to keep up to 10 connections and wait forever for one.
 */
const createPrismaClient = () => {
  const adapter = new PrismaPg({
    connectionString: serverEnv.DATABASE_URL,
    ssl: databaseSsl(serverEnv.DATABASE_URL),
    // A few per instance is plenty for this site, and the pooler's client
    // limit is shared by every instance and every preview.
    max: 5,
    // Idle connections go quickly: a suspended instance should not hold any.
    idleTimeoutMillis: 10_000,
    // Fail in seconds, not at the function's time limit, when the database is
    // unreachable or the pool is exhausted: the page then says it failed.
    connectionTimeoutMillis: 5_000,
  });

  return new PrismaClient({
    adapter,
    log: isProduction ? ['error'] : ['warn', 'error'],
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
