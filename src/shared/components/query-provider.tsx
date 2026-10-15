'use client';

import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { isApiError } from '@pkg/http/api-error';

/** How long a loaded list counts as current: see createQueryClient. */
export const ADMIN_DATA_FRESH_MS = 5 * 60_000;

/**
 * The dashboard's data cache.
 *
 * Kept long enough for the dashboard to move instantly: every list is loaded
 * once after sign-in (widgets/admin-prefetch) and counts as current for five
 * minutes, and a page opened in that time draws at once from memory. That is
 * safe because admin data changes only when an admin saves, and every save
 * here marks every cached query stale (the mutation cache below), not just
 * its own resource's: one edit can show on another screen (a category's name
 * in the articles list). What is on screen then reloads, the rest on its next
 * visit. Another admin's save in another browser shows after the five
 * minutes, or on a reload.
 */
function createQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    mutationCache: new MutationCache({
      // Signing in or out changes no data (`meta: { changesData: false }`):
      // signing out clears everything instead.
      onSuccess: (_data, _variables, _result, mutation) =>
        mutation.meta?.changesData === false ? undefined : client.invalidateQueries(),
    }),
    defaultOptions: {
      queries: {
        staleTime: ADMIN_DATA_FRESH_MS,
        // Kept in memory past its five minutes, so a screen opened later shows
        // the last list at once while it reloads.
        gcTime: 30 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Retrying a 401/403/404 just delays the error the user needs to
          // see. Only retry things that might genuinely be transient.
          if (isApiError(error) && !error.isRetryable) return false;
          return failureCount < 2;
        },
      },
      mutations: {
        // A failed write must surface immediately; a silent retry can
        // duplicate a create.
        retry: false,
      },
    },
  });
  return client;
}

/**
 * TanStack Query provider for the dashboard (and the public inquiry form).
 *
 * The client is created inside useState so each browser session gets exactly
 * one — building it at module scope would share a cache across requests during
 * SSR, leaking one user's data into another's render. Signing out clears it
 * (widgets/admin-sidebar).
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
