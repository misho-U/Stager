import path from 'node:path';

import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 configuration.
 *
 * Connection URLs no longer live in schema.prisma. This file supplies the one
 * the *migration engine* uses; the runtime client gets its own pooled URL via
 * the pg driver adapter in `pkg/db/prisma.ts`.
 *
 * `datasource.url` must be the DIRECT connection (port 5432). Migrations run
 * DDL in a real session, which pgBouncer's transaction pooling cannot support.
 *
 * Env vars come from `.env.local`, injected by dotenv-cli in the `db:*` package
 * scripts — Prisma 7 does not auto-load dotenv files.
 */
// Prisma's own message for a missing URL is "The datasource.url property is
// required in your Prisma config file", which points at this file rather than
// at the actual cause: .env.local does not exist yet, or has no DIRECT_URL.
if (!process.env.DIRECT_URL && process.env.npm_lifecycle_event?.startsWith('db:')) {
  throw new Error(
    'DIRECT_URL is not set.\n\n' +
      'Copy the template and fill it in:\n' +
      '  cp .env.example .env.local      (Windows: copy .env.example .env.local)\n\n' +
      'DIRECT_URL is the DIRECT Supabase connection string on port 5432 — ' +
      'Project Settings → Database → Connection string. Migrations need a real ' +
      'session, which the pooler on 6543 cannot give them.',
  );
}

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DIRECT_URL,
  },
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
});
