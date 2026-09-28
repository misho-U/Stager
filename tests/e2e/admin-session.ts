import path from 'node:path';

/**
 * The one signed-in admin session that every credential-gated test shares.
 *
 * admin-session.setup.ts signs in once per run, before the browser projects
 * start, and saves the session to ADMIN_SESSION. A test opts in with
 * `test.use({ storageState: ADMIN_SESSION })` and never signs in for itself:
 * the login route allows ten sign-ins per 15 minutes per IP
 * (RATE_LIMITS.login), and a sign-in per test used up a whole window in one run.
 *
 * Never sign out from a test that uses it. That revokes the session for every
 * test sharing it — and signOut() defaults to scope "global", so every other
 * session of the account too.
 */
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

/**
 * Skipping rather than failing is deliberate — a missing local credential is
 * not a broken build, and a suite that always fails is a suite nobody reads.
 */
export const CREDENTIALS_PRESENT = Boolean(ADMIN_EMAIL && ADMIN_PASSWORD);

/** Live Supabase tokens: the directory is gitignored. */
export const ADMIN_SESSION = path.join(__dirname, '.auth', 'admin.json');
