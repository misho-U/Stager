import 'server-only';

import { z } from 'zod';

/**
 * Server-only environment.
 *
 * The `server-only` import above is the guard that matters: if any client
 * component ever reaches this module, the build fails with an explicit error
 * instead of shipping the service-role key to a browser.
 */
const postgresUrl = z
  .string()
  .min(1)
  .refine(
    (value) => value.startsWith('postgres://') || value.startsWith('postgresql://'),
    'Must be a postgres:// or postgresql:// connection string',
  );

const serverEnvSchema = z.object({
  // Database — pooled at runtime, direct for migrations.
  DATABASE_URL: postgresUrl,
  DIRECT_URL: postgresUrl,

  // Supabase privileged key. Never expose.
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Admin bootstrap — seeded into the AdminUser allowlist.
  ADMIN_EMAIL: z.email({ message: 'ADMIN_EMAIL must be a valid email address' }),
  ADMIN_NAME: z.string().min(1).default('Site Owner'),

  // Vercel Blob.
  BLOB_READ_WRITE_TOKEN: z.string().min(1, 'BLOB_READ_WRITE_TOKEN is required'),

  // Resend. All three optional, because email is not load-bearing: a contact
  // submission is written to the database first and the notification is a
  // courtesy on top. sendEmail() already returns a result rather than throwing,
  // and the route keeps the inquiry with `notifiedAt` unset when it fails — so
  // demanding these at boot only blocked deployments that would have worked.
  // Inquiries are always readable in the dashboard.
  //
  // Validated as a group below: a key without a sender address is the one
  // combination that fails at send time instead of at boot.
  RESEND_API_KEY: z.string().min(1).optional(),
  MAIL_FROM: z.string().min(1).optional(),
  CONTACT_INBOX_EMAIL: z
    .email({ message: 'CONTACT_INBOX_EMAIL must be a valid email address' })
    .optional(),

  // Salt for hashing IP addresses. Long enough that the hash cannot be reversed
  // by enumerating the IPv4 space.
  IP_HASH_SALT: z.string().min(32, 'IP_HASH_SALT must be at least 32 characters'),

  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Opt-in for the cache probe (src/app/api/dev/revalidate-probe). Absent by
  // default: a dev server is often reachable on the LAN, so the endpoint stays
  // off until someone asks for it by name.
  ENABLE_CACHE_PROBE: z.literal('1').optional(),

  // Set by Vercel on every deployment, in all three environments. Used only to
  // guarantee the probe can never be switched on for the live site.
  VERCEL: z.string().optional(),
})
  .superRefine((env, ctx) => {
    // Half-configured email is worse than none: the key makes the app try to
    // send, and Resend rejects every call for a missing sender. Catch it here
    // rather than in a log nobody reads.
    if (env.RESEND_API_KEY && !env.MAIL_FROM) {
      ctx.addIssue({
        code: 'custom',
        path: ['MAIL_FROM'],
        message:
          'MAIL_FROM is required when RESEND_API_KEY is set — e.g. "STAGER <noreply@stager.ge>", on a domain verified in Resend.',
      });
    }
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
