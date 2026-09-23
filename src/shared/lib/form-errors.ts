import { isApiError } from '@pkg/http/api-error';

/**
 * Turn a thrown mutation error into something a person can act on.
 *
 * Route handlers return a bare "Something went wrong" for anything unexpected
 * (see handleRouteError), so this never risks surfacing internals — but it does
 * surface the specific, useful messages: a duplicate slug, a rate limit, a
 * session that has expired.
 */
export type ErrorContext = 'dashboard' | 'signin';

export function toFormErrorMessage(
  error: unknown,
  context: ErrorContext = 'dashboard',
): string {
  if (isApiError(error)) {
    // On the sign-in form the server's message is the precise one — "Email or
    // password is incorrect", "email is not confirmed". Replacing it with
    // "your session has expired" is nonsense to someone sitting on the sign-in
    // page, and hides the only information that would let them fix it.
    const isSignIn = context === 'signin';

    switch (error.code) {
      case 'UNAUTHENTICATED':
        return isSignIn ? error.message : 'Your session has expired. Please sign in again.';
      case 'FORBIDDEN':
        return isSignIn ? error.message : 'You do not have permission to do that.';
      case 'RATE_LIMITED':
        return isSignIn
          ? error.message
          : 'Too many requests. Please wait a moment and try again.';
      default:
        return error.message;
    }
  }

  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

/** Field-level messages from a 422, keyed by the form field path. */
export function toFieldErrors(error: unknown): Record<string, string> {
  if (!isApiError(error) || !error.fields) return {};

  return Object.fromEntries(
    Object.entries(error.fields).map(([field, messages]) => [field, messages[0] ?? 'Invalid']),
  );
}
