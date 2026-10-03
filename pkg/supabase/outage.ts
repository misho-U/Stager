import { isAuthApiError, isAuthRetryableFetchError, type AuthError } from '@supabase/supabase-js';

/**
 * Whether a failed `getUser()` means the sign-in service could not be asked,
 * as opposed to a missing or rejected session.
 *
 * It decides where a person goes. Someone signed out belongs on the login
 * page; during an outage (a paused Free project, Supabase down) that page
 * cannot sign anyone in either, and an admin sent there blames their password.
 *
 * Narrow on purpose: supabase-js gives some bad-session errors a status of
 * 500 of their own, and one of those taken for an outage would keep a person
 * away from the login page for good.
 */
export function isAuthOutage(error: AuthError): boolean {
  return (
    // No answer at all, or 502/503/504 from the gateway in front of it.
    isAuthRetryableFetchError(error) ||
    // An answer, and a failure of its own (its database down, say).
    (isAuthApiError(error) && error.status >= 500) ||
    // An error page where JSON belonged: whatever stands in front failed.
    error.name === 'AuthUnknownError'
  );
}
