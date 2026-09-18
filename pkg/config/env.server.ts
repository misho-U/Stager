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

  // Resend.
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  MAIL_FROM: z.string().min(1, 'MAIL_FROM is required'),
  CONTACT_INBOX_EMAIL: z.email({ message: 'CONTACT_INBOX_EMAIL must be a valid email address' }),

  // Salt for hashing IP addresses. Long enough that the hash cannot be reversed
  // by enumerating the IPv4 space.
  IP_HASH_SALT: z.string().min(32, 'IP_HASH_SALT must be at least 32 characters'),

  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
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
