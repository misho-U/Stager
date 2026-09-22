/**
 * `pnpm doctor` — report the real state of the setup.
 *
 * Sign-in requires two independent systems to agree: a Supabase Auth account
 * and an active row in our own AdminUser allowlist. Neither is visible from the
 * login form, and a mismatch in either looks identical to a wrong password.
 * This prints the truth about both, plus the configuration that connects them.
 *
 * Read-only. Exits non-zero if any check fails, so CI can use it too.
 */
import {
  CHECK,
  CROSS,
  WARN,
  createAdminSupabase,
  createScriptPrisma,
  dim,
  findSupabaseUserByEmail,
  green,
  portOf,
  red,
  refFromApiUrl,
  refFromDatabaseUrl,
  yellow,
} from './lib/setup';

type Status = 'pass' | 'fail' | 'warn';

type Result = { status: Status; label: string; detail?: string };

const results: Result[] = [];

function record(status: Status, label: string, detail?: string) {
  results.push(detail === undefined ? { status, label } : { status, label, detail });

  const icon = status === 'pass' ? green(CHECK) : status === 'warn' ? yellow(WARN) : red(CROSS);
  console.warn(`${icon} ${label}`);
  if (detail) console.warn(`  ${dim(detail)}`);
}

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const REQUIRED_VARS = [
  'DATABASE_URL',
  'DIRECT_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ADMIN_EMAIL',
  'NEXT_PUBLIC_SITE_URL',
  'IP_HASH_SALT',
] as const;

function checkEnvironment() {
  console.warn('\nEnvironment');

  const missing = REQUIRED_VARS.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    record('fail', 'Required variables are set', `missing: ${missing.join(', ')}`);
  } else {
    record('pass', 'Required variables are set');
  }

  // A placeholder left in from .env.example fails in confusing ways later.
  const placeholders = REQUIRED_VARS.filter((name) => {
    const value = process.env[name] ?? '';
    return value.includes('<') || value.includes('placeholder');
  });

  if (placeholders.length > 0) {
    record('fail', 'No placeholder values left', `still templated: ${placeholders.join(', ')}`);
  } else {
    record('pass', 'No placeholder values left');
  }
}

/**
 * The Supabase URL must be a bare origin.
 *
 * This is reported before anything else in this section because it is the one
 * misconfiguration that makes every later check lie: with a `/rest/v1/` suffix
 * the project ref still parses and the database still connects, but every auth
 * request 404s and the login form calls it a wrong password.
 */
function checkSupabaseUrlShape() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    record('fail', 'NEXT_PUBLIC_SUPABASE_URL is a valid URL', `Could not parse "${raw}".`);
    return;
  }

  const hasPath = url.pathname !== '' && url.pathname !== '/';

  if (!hasPath && !url.search && !url.hash) {
    record('pass', 'NEXT_PUBLIC_SUPABASE_URL is a bare origin');
    return;
  }

  record(
    'fail',
    'NEXT_PUBLIC_SUPABASE_URL is a bare origin',
    `It is "${raw}". Remove everything after the host — the client appends its own ` +
      `/auth/v1 and /rest/v1 paths, so a suffix here sends auth to ${url.origin}` +
      `${url.pathname.replace(/\/$/, '')}/auth/v1/token and Supabase answers ` +
      '"Invalid path specified in request URL". ' +
      `Use ${url.origin}`,
  );
}

/**
 * Email is optional, so report its state rather than failing on it. Without
 * this line an unset RESEND_API_KEY looks like something forgotten, when it is
 * a supported way to run the site before Resend's DNS verification completes.
 */
function checkEmail() {
  console.warn('\nEmail (optional)');

  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  const placeholderKey = !key || key.includes('placeholder') || key.includes('<');

  if (placeholderKey) {
    record(
      'warn',
      'Resend is configured',
      'Not set. The contact form still records every inquiry and the dashboard still ' +
        'shows them — only the notification email is skipped. Set RESEND_API_KEY and ' +
        'MAIL_FROM once your sending domain is verified.',
    );
    return;
  }

  if (!from) {
    record(
      'fail',
      'Resend is configured',
      'RESEND_API_KEY is set but MAIL_FROM is not, so every send is rejected. ' +
        'Set MAIL_FROM to an address on a domain verified in Resend.',
    );
    return;
  }

  const inbox = process.env.CONTACT_INBOX_EMAIL ?? process.env.ADMIN_EMAIL;
  record('pass', `Resend is configured (from ${from}, to ${inbox ?? 'unset'})`);
}

function checkProjectRefs() {
  console.warn('\nSupabase project');

  checkSupabaseUrlShape();

  const apiRef = refFromApiUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const dbRef =
    refFromDatabaseUrl(process.env.DATABASE_URL) ?? refFromDatabaseUrl(process.env.DIRECT_URL);

  if (!apiRef || !dbRef) {
    record(
      'warn',
      'Project ref could be read from both URLs',
      `api=${apiRef ?? 'unknown'} database=${dbRef ?? 'unknown'} — skipping the match check`,
    );
    return;
  }

  if (apiRef === dbRef) {
    record('pass', `API and database are the same project (${apiRef})`);
  } else {
    // The failure this catches: auth reaches a real but different project, so
    // the admin account genuinely does not exist there, and Supabase reports
    // that as invalid_credentials — indistinguishable from a wrong password.
    record(
      'fail',
      'API and database are the same project',
      `NEXT_PUBLIC_SUPABASE_URL is project "${apiRef}" but the database is "${dbRef}". ` +
        'Sign-in checks a different project from the one your data is in.',
    );
  }

  const pooledPort = portOf(process.env.DATABASE_URL);
  const directPort = portOf(process.env.DIRECT_URL);

  if (pooledPort === '6543' && directPort === '5432') {
    record('pass', 'DATABASE_URL is pooled (6543), DIRECT_URL is direct (5432)');
  } else {
    record(
      'warn',
      'DATABASE_URL is pooled (6543), DIRECT_URL is direct (5432)',
      `found DATABASE_URL=${pooledPort ?? '?'} DIRECT_URL=${directPort ?? '?'} — ` +
        'migrations need a real session, which the pooler cannot give them',
    );
  }
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

async function checkDatabase(adminEmail: string) {
  console.warn('\nDatabase');

  const prisma = createScriptPrisma();

  try {
    await prisma.$queryRaw`SELECT 1`;
    record('pass', 'Database reachable');
  } catch (error) {
    record('fail', 'Database reachable', error instanceof Error ? error.message : String(error));
    await prisma.$disconnect();
    return;
  }

  try {
    const services = await prisma.service.count();
    record('pass', 'Migrations applied', `${services} services seeded`);
  } catch {
    record('fail', 'Migrations applied', 'tables are missing — run `pnpm db:migrate`');
    await prisma.$disconnect();
    return;
  }

  try {
    const adminUser = await prisma.adminUser.findUnique({
      where: { email: adminEmail.toLowerCase() },
      select: { id: true, role: true, isActive: true, supabaseUserId: true, lastLogin: true },
    });

    if (!adminUser) {
      record(
        'fail',
        `AdminUser allowlist contains ${adminEmail}`,
        'run `pnpm db:seed` (or `pnpm admin:set-password`, which also adds the row)',
      );
    } else if (!adminUser.isActive) {
      record('fail', `AdminUser allowlist contains ${adminEmail}`, 'the row exists but isActive is false');
    } else {
      record(
        'pass',
        `AdminUser allowlist contains ${adminEmail}`,
        `role=${adminUser.role} linked=${adminUser.supabaseUserId ? 'yes' : 'not yet'} ` +
          `lastLogin=${adminUser.lastLogin?.toISOString() ?? 'never'}`,
      );
    }
  } catch (error) {
    record('fail', 'AdminUser allowlist readable', error instanceof Error ? error.message : String(error));
  }

  await prisma.$disconnect();
}

// ---------------------------------------------------------------------------
// Supabase Auth — the half that has been failing
// ---------------------------------------------------------------------------

async function checkSupabaseAuth(adminEmail: string) {
  console.warn('\nSupabase Auth');

  let supabase: ReturnType<typeof createAdminSupabase>;
  try {
    supabase = createAdminSupabase();
  } catch (error) {
    record('fail', 'Service-role client built', error instanceof Error ? error.message : String(error));
    return;
  }

  let user: Awaited<ReturnType<typeof findSupabaseUserByEmail>>;
  try {
    user = await findSupabaseUserByEmail(supabase, adminEmail);
    record('pass', 'Auth API reachable with the service-role key');
  } catch (error) {
    record(
      'fail',
      'Auth API reachable with the service-role key',
      error instanceof Error ? error.message : String(error),
    );
    return;
  }

  if (!user) {
    record(
      'fail',
      `Supabase account exists for ${adminEmail}`,
      'no such user in this project — run `pnpm admin:set-password` to create it',
    );
    return;
  }

  record('pass', `Supabase account exists for ${adminEmail}`, `id=${user.id}`);

  // The decisive checks. None of these are visible from the login form, and
  // every one of them surfaces as "Email or password is incorrect".
  if (user.emailConfirmedAt) {
    record('pass', 'Email is confirmed');
  } else {
    record(
      'fail',
      'Email is confirmed',
      'an unconfirmed account cannot sign in. Run `pnpm admin:set-password`, which confirms it.',
    );
  }

  if (user.bannedUntil) {
    record('fail', 'Account is not banned', `banned until ${user.bannedUntil}`);
  } else {
    record('pass', 'Account is not banned');
  }

  if (user.invitedAt && !user.lastSignInAt) {
    record(
      'warn',
      'Account has been used before',
      'this user was INVITED and has never signed in, so it may have no password set. ' +
        'Run `pnpm admin:set-password` to give it one.',
    );
  } else if (!user.lastSignInAt) {
    record('warn', 'Account has been used before', 'never signed in — expected if this is the first run');
  } else {
    record('pass', 'Account has been used before', `last sign-in ${user.lastSignInAt}`);
  }
}

// ---------------------------------------------------------------------------

async function main() {
  console.warn('STAGER setup check');

  checkEnvironment();
  checkEmail();
  checkProjectRefs();

  const adminEmail = process.env.ADMIN_EMAIL;

  // Each group is gated only on what IT needs. A broken Supabase key must not
  // hide a working database — reporting "everything is wrong" when one thing is
  // wrong is how a diagnostic stops being worth running.
  if (adminEmail && (process.env.DIRECT_URL || process.env.DATABASE_URL)) {
    await checkDatabase(adminEmail);
  } else {
    console.warn(`\n${yellow(WARN)} Skipping database checks — ADMIN_EMAIL or DIRECT_URL is unset.`);
  }

  if (adminEmail && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await checkSupabaseAuth(adminEmail);
  } else {
    console.warn(`\n${yellow(WARN)} Skipping auth checks — Supabase URL or service-role key is unset.`);
  }

  const failures = results.filter((result) => result.status === 'fail').length;
  const warnings = results.filter((result) => result.status === 'warn').length;

  console.warn('');
  if (failures === 0) {
    console.warn(green(`${CHECK} ${results.length} checks passed${warnings ? `, ${warnings} warning(s)` : ''}.`));
    if (warnings === 0) console.warn(dim('Sign-in should work. If it does not, paste this output.'));
  } else {
    console.warn(red(`${CROSS} ${failures} check(s) failed.`));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('doctor failed unexpectedly:', error);
  process.exitCode = 1;
});
