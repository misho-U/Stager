/**
 * Refuses a command that rewrites the database (`db:migrate`, `db:reset`,
 * `db:push`, `db:seed`) when the database is not on this machine, unless that
 * is asked for by name:
 *
 *   ALLOW_REMOTE_DB=1 pnpm db:seed
 *
 * .env.local names whatever database you work against, and on a machine set
 * up to edit content that is the LIVE one: every deployment shares it.
 * `prisma migrate dev` there can offer to reset the schema (one "y" empties
 * the site), and the seed is meant for a fresh database.
 *
 * `pnpm db:migrate:deploy` is not guarded: it only applies committed
 * migrations, which is how the live database is meant to be updated.
 *
 * Usage (package.json): `tsx scripts/db-guard.ts <command name> && <command>`.
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const command = process.argv[2] ?? 'this command';
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

function hostOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.replace(/^\[|\]$/g, '');
  } catch {
    return null;
  }
}

const host = hostOf(url);

if (!host) {
  console.error(`[db-guard] ${command}: no usable DIRECT_URL or DATABASE_URL in .env.local.`);
  process.exit(1);
}

if (!LOCAL_HOSTS.has(host) && process.env.ALLOW_REMOTE_DB !== '1') {
  console.error(
    [
      `[db-guard] Refusing to run ${command} against ${host}, which is not on this machine.`,
      '',
      'This database is probably the live one: every deployment shares it, and',
      `${command} rewrites data or schema there. Point .env.local at a local`,
      'database, or if this really is what you want, say so:',
      '',
      `  ALLOW_REMOTE_DB=1 pnpm ${command}`,
    ].join('\n'),
  );
  process.exit(1);
}
