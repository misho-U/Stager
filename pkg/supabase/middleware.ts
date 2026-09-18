import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';

import { clientEnv } from '@pkg/config/env.client';

/**
 * Refreshes the Supabase auth session for the current request.
 *
 * Supabase access tokens are short-lived. Without this running on every
 * request, a session would appear valid in the browser but be expired by the
 * time a server component reads it. The refreshed cookies are written onto
 * `response`, so the caller must return that exact response object.
 *
 * Runs in the Edge runtime, which is why it cannot look up the AdminUser
 * allowlist — Prisma does not run on Edge. Middleware therefore only proves
 * "there is a valid Supabase session"; `requireAdmin()` in the Node runtime
 * decides whether that user is actually allowed in.
 */
export async function refreshSupabaseSession(request: NextRequest, response: NextResponse) {
  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
