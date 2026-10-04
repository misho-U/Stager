import 'server-only';

import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

import { AuthUnavailableError, ForbiddenError, UnauthenticatedError } from '@pkg/auth/errors';
import type {
  ApiErrorBody,
  ApiErrorCode,
  ApiErrorReason,
  ApiValidationIssue,
} from '@pkg/http/api-error';
import { toValidationIssue } from '@pkg/http/validation-issue';
import { describeDbError } from '@pkg/db/errors';
import { logger, serialiseError } from '@pkg/logger';
import { reportServerError } from '@pkg/monitoring/server';

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
  UNAVAILABLE: 503,
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
  options?: {
    reason?: ApiErrorReason;
    fields?: Record<string, string[]>;
    issues?: Record<string, ApiValidationIssue[]>;
    headers?: Record<string, string>;
  },
) {
  const body: ApiErrorBody = {
    error: {
      code,
      message,
      ...(options?.reason ? { reason: options.reason } : {}),
      ...(options?.fields ? { fields: options.fields } : {}),
      ...(options?.issues ? { issues: options.issues } : {}),
    },
  };

  return NextResponse.json(body, {
    status: STATUS_BY_CODE[code],
    ...(options?.headers ? { headers: options.headers } : {}),
  });
}

/**
 * Turns a Zod failure into a 422 a form can render: per-field English messages,
 * and the same problems as data (`issues`), which the dashboard words in the
 * admin's own language.
 */
export function apiValidationFailed(error: ZodError) {
  const fields: Record<string, string[]> = {};
  const issues: Record<string, ApiValidationIssue[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    (fields[path] ??= []).push(issue.message);
    (issues[path] ??= []).push(toValidationIssue(issue));
  }

  return apiFail('VALIDATION_FAILED', 'Some fields need attention', { fields, issues });
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

  // Logged where it was found (getSupabaseUser). A 401 here would send the
  // dashboard to the login page, which cannot sign anyone in either.
  if (error instanceof AuthUnavailableError) {
    return apiFail('UNAVAILABLE', error.message, { reason: 'AUTH_UNREACHABLE' });
  }

  // The database refusing a write because the data changed under it, or a
  // value it cannot hold, is an answer for the caller, not a crash. Each used
  // to come back as a bare 500.
  const db = describeDbError(error);
  const dbAnswer =
    db?.code === 'P2025'
      ? apiFail('NOT_FOUND', 'This item no longer exists')
      : db?.code === 'P2003'
        ? apiFail('CONFLICT', 'Something this links to no longer exists', {
            reason: 'STALE_REFERENCE',
          })
        : db?.code === 'P2002'
          ? apiFail('CONFLICT', 'This clashes with something that already exists')
          : db?.code === 'P2020'
            ? apiFail('VALIDATION_FAILED', 'A value is out of range')
            : null;

  if (db && dbAnswer) {
    logger.warn('api.database_refused', { ...context, code: db.code, constraint: db.constraint });
    return dbAnswer;
  }

  // Reported as the error itself, so Sentry groups it by its stack, not under
  // one "unhandled error" heading.
  logger.error('api.unhandled_error', { ...context, ...serialiseError(error) }, { report: false });
  reportServerError(error, context);
  return apiFail('INTERNAL', 'Something went wrong');
}
