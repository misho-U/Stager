/**
 * A refusal from Resend as it may be logged: its code and HTTP status. Never
 * its message, which can name the address it refused ("Invalid `to` field:
 * visitor@…"), and the log and Sentry must not hold a visitor's address.
 */
export type MailRejection = { code: string; status: number | null };

/** Resend's error. Its `message` is deliberately never read. */
type ResendError = { name?: unknown; statusCode?: unknown; message?: unknown };

export function describeMailRejection(error: ResendError): MailRejection {
  return {
    code: typeof error.name === 'string' && error.name ? error.name : 'unknown_error',
    status: typeof error.statusCode === 'number' ? error.statusCode : null,
  };
}
