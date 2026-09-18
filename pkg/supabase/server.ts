import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { clientEnv } from '@pkg/config/env.client';

/**
 * Supabase client for server components, route handlers and server actions.
 *
 * Reads and writes the auth cookies through Next's cookie store so the session
 * stays in sync across the request.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server components cannot set cookies. That is fine: middleware
            // has already refreshed the session for this request, so the only
            // thing lost here is a redundant write.
          }
        },
      },
    },
  );
}

/**
 * The authenticated Supabase user, or null.
 *
 * Always `getUser()`, never `getSession()` — getSession decodes the cookie
 * without verifying its signature, so a forged cookie would pass. getUser
 * validates the JWT against Supabase. An ESLint rule bans getSession outright.
 */
export async function getSupabaseUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) return null;
  return user;
}
