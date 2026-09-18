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
