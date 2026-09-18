import { isApiError } from '@pkg/http/api-error';

/**
 * Turn a thrown mutation error into something a person can act on.
 *
 * Route handlers return a bare "Something went wrong" for anything unexpected
 * (see handleRouteError), so this never risks surfacing internals — but it does
 * surface the specific, useful messages: a duplicate slug, a rate limit, a
 * session that has expired.
 */
export function toFormErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    switch (error.code) {
      case 'UNAUTHENTICATED':
        return 'Your session has expired. Please sign in again.';
      case 'FORBIDDEN':
        return 'You do not have permission to do that.';
      case 'RATE_LIMITED':
        return 'Too many requests. Please wait a moment and try again.';
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
