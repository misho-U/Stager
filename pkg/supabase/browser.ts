'use client';

import { createBrowserClient } from '@supabase/ssr';

import { clientEnv } from '@pkg/config/env.client';

/**
 * Supabase client for client components. Uses the anon key only.
 *
 * Note that the anon key grants nothing on its own: every table has RLS enabled
 * with no policies, so PostgREST returns zero rows to this client. It exists
 * purely to run the auth handshake (sign in / sign out / token refresh).
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
