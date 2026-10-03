/**
 * Vercel's build command (`vercel-build` in package.json, which Vercel runs
 * instead of `build` when it exists).
 *
 * A production deployment first applies the committed migrations, so new code
 * never runs against an old schema. Nothing applied them before: a schema
 * change broke the live site until someone ran them by hand. If a migration
 * fails, the build fails, and Vercel keeps serving the previous deployment.
 *
 * Previews do not migrate. They share the production database, and an
 * unmerged branch must not change its schema.
 */
import { spawnSync } from 'node:child_process';

function run(command: string, args: string[], hint?: string) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    if (hint) console.error(`\n[vercel-build] ${hint}`);
    process.exit(result.status ?? 1);
  }
}

if (process.env.VERCEL_ENV === 'production') {
  console.warn('[vercel-build] production: applying pending migrations');
  run(
    'pnpm',
    ['exec', 'prisma', 'migrate', 'deploy'],
    // The likeliest cause by far: Supabase's direct host is IPv6-only on the
    // Free plan, and Vercel builds cannot reach IPv6.
    'Migrations failed, so this deployment stops here and the previous one keeps serving. ' +
      'If the error above says the database cannot be reached, check DIRECT_URL in ' +
      'Vercel: it must be the Session pooler string ' +
      '(postgres.<ref>@aws-0-<region>.pooler.supabase.com:5432), not db.<ref>.supabase.co.',
  );
} else {
  console.warn(`[vercel-build] ${process.env.VERCEL_ENV ?? 'local'}: migrations left alone`);
}

run('pnpm', ['run', 'build']);
