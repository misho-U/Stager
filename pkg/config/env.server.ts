import 'server-only';

import { z } from 'zod';

/**
 * Server-only environment.
 *
 * The `server-only` import above is the guard that matters: if any client
 * component ever reaches this module, the build fails with an explicit error
 * instead of shipping the service-role key to a browser.
 */
/**
 * Every message names its own variable.
 *
 * zod's prettified output does not print the key for a failure raised inside a
 * reusable schema, so a shared one produced "Must be a postgres:// or
 * postgresql:// connection string" twice with nothing to say WHICH of
 * DATABASE_URL and DIRECT_URL was wrong. In a hosting provider's build log,
 * where that string is all anyone gets, an unnamed variable is a guessing game.
 */
const postgresUrl = (name: string) =>
  z
    .string()
    .min(1, `${name} is required`)
    .refine(
      // Blank is already reported as "required" by min(1) above; letting it
      // pass here keeps one failure from printing two messages, the second of
      // which would claim the value is set.
      (value) =>
        value === '' || value.startsWith('postgres://') || value.startsWith('postgresql://'),
      `${name} is set but is not a connection string — it must start with postgres:// or postgresql://`,
    );

/**
 * An env var that exists but is blank counts as unset.
 *
 * Vercel creates a variable with an empty value when one is added to the
 * dashboard without filling it in, and an empty string is not `undefined`, so
 * `.optional()` alone still rejects it — which fails the build for a variable
 * that is genuinely not required. Shell exports behave the same way
 * (`FOO=` yields `''`), so this is not Vercel-specific.
 */
const blankAsUnset = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const serverEnvSchema = z.object({
  // Database — pooled at runtime, direct for migrations.
  DATABASE_URL: postgresUrl('DATABASE_URL'),
  DIRECT_URL: postgresUrl('DIRECT_URL'),

  // Supabase privileged key. Never expose.
  //
  // Optional, because the DEPLOYED APP NEVER READS IT. Grep says so: the only
  // consumers are scripts/doctor.ts and scripts/lib/setup.ts, which run under
  // tsx outside Next.js and read process.env directly. Requests from the site
  // itself are authorised by the anon key plus the user's own session, and the
  // AdminUser allowlist is checked through Prisma — none of that needs a key
  // that bypasses RLS.
  //
  // Requiring it here meant a deployment could not build without pasting the
  // most dangerous secret in the project into a host that has no use for it.
  // Set it in .env.local, where `pnpm admin:set-password` and `pnpm
  // setup:check` need it; leave it out of Vercel.
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(blankAsUnset, z.string().min(1).optional()),

  // Admin bootstrap — seeded into the AdminUser allowlist.
  ADMIN_EMAIL: z.email({ message: 'ADMIN_EMAIL must be a valid email address' }),
  // Blank-as-unset matters for a defaulted value too: `''` is present, so the
  // default never applies and `.min(1)` fails instead.
  ADMIN_NAME: z.preprocess(blankAsUnset, z.string().min(1).default('Site Owner')),

  // Vercel Blob.
  BLOB_READ_WRITE_TOKEN: z.string().min(1, 'BLOB_READ_WRITE_TOKEN is required'),

  // Resend. All three optional, because email is not load-bearing: a contact
  // submission is written to the database first and the notification is a
  // courtesy on top. sendEmail() already returns a result rather than throwing,
  // and the route keeps the inquiry with `notifiedAt` unset when it fails — so
  // demanding these at boot only blocked deployments that would have worked.
  // Inquiries are always readable in the dashboard.
  //
  // A key without a sender address is a real misconfiguration, but it is NOT
  // a boot error: an earlier version failed the build on it, which took the
  // whole site down because an email address was missing — the exact mistake
  // this block exists to avoid. sendEmail() requires both and degrades to
  // "email off" when either is absent, and `pnpm setup:check` reports it as a
  // failure, which is where an operator can act on it.
  RESEND_API_KEY: z.preprocess(blankAsUnset, z.string().min(1).optional()),
  MAIL_FROM: z.preprocess(blankAsUnset, z.string().min(1).optional()),
  CONTACT_INBOX_EMAIL: z.preprocess(
    blankAsUnset,
    z.email({ message: 'CONTACT_INBOX_EMAIL must be a valid email address' }).optional(),
  ),

  // Salt for hashing IP addresses. Long enough that the hash cannot be reversed
  // by enumerating the IPv4 space.
  IP_HASH_SALT: z.string().min(32, 'IP_HASH_SALT must be at least 32 characters'),

  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Opt-in for the cache probe (src/app/api/dev/revalidate-probe). Absent by
  // default: a dev server is often reachable on the LAN, so the endpoint stays
  // off until someone asks for it by name.
  ENABLE_CACHE_PROBE: z.preprocess(blankAsUnset, z.literal('1').optional()),

  // Set by Vercel on every deployment, in all three environments. Used only to
  // guarantee the probe can never be switched on for the live site.
  VERCEL: z.string().optional(),
});

const parsed = serverEnvSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid server environment variables:\n${z.prettifyError(parsed.error)}\n\nCopy .env.example to .env.local and fill it in.`,
  );
}

export const serverEnv = parsed.data;

export const isProduction = serverEnv.NODE_ENV === 'production';
export const isDevelopment = serverEnv.NODE_ENV === 'development';

/**
 * Two independent gates for the cache probe, because either alone is too weak:
 *
 *  - the flag alone would be one stray Vercel variable away from exposing it;
 *  - NODE_ENV alone would expose it to anyone who can reach a dev server on the
 *    LAN, and would also disable it under `pnpm start`, which is how CI runs
 *    the Playwright suite — a guard that breaks the test is a guard that gets
 *    deleted.
 *
 * Keying the second gate on VERCEL rather than NODE_ENV draws the line where
 * the risk actually is: the deployed site can never turn this on, however its
 * environment is configured.
 */
export const isCacheProbeEnabled =
  serverEnv.VERCEL === undefined && serverEnv.ENABLE_CACHE_PROBE === '1';
