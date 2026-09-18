import 'server-only';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { isProduction, serverEnv } from '@pkg/config/env.server';

/**
 * The single Prisma client for the whole app.
 *
 * Only `src/app/api/**` may import this — enforced by ESLint
 * (`@typescript-eslint/no-restricted-imports` in eslint.config.mjs). Everything
 * else reaches data through an entity `.api.ts` that calls those routes, so
 * there is exactly one place where a query can be written.
 *
 * Prisma 7 requires a driver adapter; we use node-postgres against the POOLED
 * Supabase URL. The connection string already carries `pgbouncer=true` and
 * `connection_limit=1` so that a serverless instance never holds more than one
 * connection open against the transaction pooler.
 */
const createPrismaClient = () => {
  const adapter = new PrismaPg({ connectionString: serverEnv.DATABASE_URL });

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
