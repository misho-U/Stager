import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * Tests that write to the database run only against a local one.
 *
 * `.env.local` names whatever database the developer works against, and on a
 * machine set up to edit content that is the LIVE one: every deployment shares
 * it. A writing test there puts test content in front of visitors for as long
 * as it runs, and leaves it behind when a run is killed half-way. CI and the
 * dev container use a local Postgres; anything else must be asked for by name
 * with E2E_ALLOW_SHARED_DB=1.
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export function testDatabaseUrl(): string | undefined {
  return process.env.DIRECT_URL || process.env.DATABASE_URL;
}

export function isLocalDatabase(url = testDatabaseUrl()): boolean {
  if (!url) return false;
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname.replace(/^\[|\]$/g, ''));
  } catch {
    return false;
  }
}

/** True when this run may write to the database. */
export const DB_WRITES_ALLOWED = isLocalDatabase() || process.env.E2E_ALLOW_SHARED_DB === '1';

export const DB_WRITES_SKIP_REASON =
  'Writes to the database, so it runs only against a local one (set E2E_ALLOW_SHARED_DB=1 to override).';

let client: PrismaClient | undefined;

/** One Prisma client per worker, for tests that set up or clean up rows directly. */
export function testPrisma(): PrismaClient {
  client ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: testDatabaseUrl() }),
  });
  return client;
}

export async function disconnectTestPrisma(): Promise<void> {
  await client?.$disconnect();
  client = undefined;
}
