'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { isApiError } from '@pkg/http/api-error';

/**
 * TanStack Query provider for the dashboard.
 *
 * The client is created inside useState so each browser session gets exactly
 * one — building it at module scope would share a cache across requests during
 * SSR, leaking one user's data into another's render.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Admin data changes because the admin changed it, and mutations
            // invalidate explicitly. A short stale window avoids refetching the
            // whole list every time a tab regains focus.
            staleTime: 30_000,
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
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
