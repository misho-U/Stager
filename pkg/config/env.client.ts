import { z } from 'zod';

/**
 * Public environment. Safe to import from anywhere, including client components
 * and Edge middleware.
 *
 * Every `process.env.NEXT_PUBLIC_*` reference below must be written out in full
 * — Next.js inlines these at build time by literal text substitution, so
 * `process.env[key]` would silently produce `undefined` in the browser.
 */
/**
 * The Supabase URL must be a bare origin — `https://<ref>.supabase.co`.
 *
 * A trailing path is the single most expensive misconfiguration this project
 * has hit. `https://<ref>.supabase.co/rest/v1/` sends every auth call to
 * `/rest/v1/auth/v1/token`, which Supabase answers with "Invalid path specified
 * in request URL" — and the login form reported that as a wrong password, so
 * three rounds of debugging went into the credentials instead of the URL.
 * Refusing to boot is far cheaper than a lie at the login screen.
 */
const supabaseOrigin = z
  .url({ message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL' })
  .refine(
    (value) => {
      const url = new URL(value);
      return (
        (url.pathname === '' || url.pathname === '/') && url.search === '' && url.hash === ''
      );
    },
    {
      message:
        'NEXT_PUBLIC_SUPABASE_URL must be the bare project origin with no path, query or hash — https://<project-ref>.supabase.co (not .../rest/v1/)',
    },
  );

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: supabaseOrigin,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  NEXT_PUBLIC_SITE_URL: z.url({ message: 'NEXT_PUBLIC_SITE_URL must be a valid URL' }),
});

const parsed = clientEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

if (!parsed.success) {
  throw new Error(
    `Invalid public environment variables:\n${z.prettifyError(parsed.error)}\n\nCopy .env.example to .env.local and fill it in.`,
  );
}

export const clientEnv = parsed.data;

/** Origin without a trailing slash, for building absolute URLs. */
export const SITE_ORIGIN = clientEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
