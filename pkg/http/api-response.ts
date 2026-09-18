import 'server-only';

import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

import { ForbiddenError, UnauthenticatedError } from '@pkg/auth/errors';
import type { ApiErrorBody, ApiErrorCode } from '@pkg/http/api-error';
import { logger, serialiseError } from '@pkg/logger';

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_FAILED: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  INTERNAL: 500,
};

export function apiOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function apiCreated<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function apiNoContent() {
  return new NextResponse(null, { status: 204 });
}

export function apiFail(
  code: ApiErrorCode,
  message: string,
  options?: { fields?: Record<string, string[]>; headers?: Record<string, string> },
) {
  const body: ApiErrorBody = {
    error: { code, message, ...(options?.fields ? { fields: options.fields } : {}) },
  };

  return NextResponse.json(body, {
    status: STATUS_BY_CODE[code],
    ...(options?.headers ? { headers: options.headers } : {}),
  });
}

/** Turns a Zod failure into a 422 with per-field messages a form can render. */
export function apiValidationFailed(error: ZodError) {
  const fields: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    (fields[path] ??= []).push(issue.message);
  }

  return apiFail('VALIDATION_FAILED', 'Some fields need attention', { fields });
}

/**
 * Last-resort error mapper for route handlers.
 *
 * Known auth failures map to their status. Anything else is logged in full and
 * reported to the caller as a bare 500 — an unexpected error message can carry
 * a table name, a query fragment or a connection string, none of which belongs
 * in an HTTP response.
 */
export function handleRouteError(error: unknown, context: Record<string, unknown> = {}) {
  if (error instanceof UnauthenticatedError) {
    return apiFail('UNAUTHENTICATED', error.message);
  }

  if (error instanceof ForbiddenError) {
    return apiFail('FORBIDDEN', error.message);
  }

  logger.error('api.unhandled_error', { ...context, ...serialiseError(error) });
  return apiFail('INTERNAL', 'Something went wrong');
}
