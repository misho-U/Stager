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
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    /** Field-level messages, keyed by dot-path, for form error display. */
    fields?: Record<string, string[]>;
  };
};

/** Thrown by the fetch helpers when /api responds with a non-2xx status. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly fields?: Record<string, string[]>;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  /** True when retrying could plausibly succeed. */
  get isRetryable() {
    return this.status >= 500 || this.code === 'RATE_LIMITED';
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}
