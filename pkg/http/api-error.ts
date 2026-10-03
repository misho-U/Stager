/** Machine-readable error codes returned by /api. */
export const API_ERROR_CODES = [
  'BAD_REQUEST',
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'INTERNAL',
  // Something this depends on cannot be reached; trying again later can work.
  'UNAVAILABLE',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/**
 * Narrows a code where one code covers cases a person has to tell apart: a
 * wrong password and an unconfirmed account are both UNAUTHENTICATED, but ask
 * for different fixes. The dashboard words each one in its own language; the
 * English `message` stays for logs and API callers.
 */
export const API_ERROR_REASONS = [
  'INVALID_CREDENTIALS',
  'EMAIL_NOT_CONFIRMED',
  'AUTH_UNREACHABLE',
  'AUTH_MISCONFIGURED',
  'NOT_ALLOWED',
  'RATE_LIMITED',
  'PROVIDER_RATE_LIMITED',
  'MEDIA_IN_USE',
  // A contact submission on a deployment that does not deliver them (a
  // preview, the dev server): the form says nothing was sent, and why.
  'DELIVERY_OFF',
  // A save that names something deleted meanwhile (a category, an author, an
  // image): reload and choose again.
  'STALE_REFERENCE',
] as const;

export type ApiErrorReason = (typeof API_ERROR_REASONS)[number];

/**
 * One validation problem as data rather than words: which check failed and the
 * limit it broke. A serialisable subset of a zod issue, so the dashboard can
 * say it in the admin's language (src/shared/lib/validation-message.ts).
 */
export type ApiValidationIssue = {
  code: string;
  origin?: string;
  format?: string;
  minimum?: number;
  maximum?: number;
  /** A regex check's pattern, as its source. */
  pattern?: string;
  params?: Record<string, unknown>;
  expected?: string;
};

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    reason?: ApiErrorReason;
    /** Field-level messages, keyed by dot-path, for form error display. */
    fields?: Record<string, string[]>;
    /** The same field problems as data, keyed the same way. */
    issues?: Record<string, ApiValidationIssue[]>;
  };
};

type ApiErrorDetails = Pick<ApiErrorBody['error'], 'reason' | 'fields' | 'issues'>;

/** Thrown by the fetch helpers when /api responds with a non-2xx status. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly reason?: ApiErrorReason;
  readonly fields?: Record<string, string[]>;
  readonly issues?: Record<string, ApiValidationIssue[]>;

  constructor(status: number, code: ApiErrorCode, message: string, details: ApiErrorDetails = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.reason = details.reason;
    this.fields = details.fields;
    this.issues = details.issues;
  }

  /** True when retrying could plausibly succeed. */
  get isRetryable() {
    return this.status >= 500 || this.code === 'RATE_LIMITED';
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}
