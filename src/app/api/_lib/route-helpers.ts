import type { NextRequest } from 'next/server';
import type { z } from 'zod';

import { requireAdmin, type AdminSession } from '@pkg/auth/admin-session';
import { prisma } from '@pkg/db/prisma';
import { apiFail, apiValidationFailed, handleRouteError } from '@pkg/http/api-response';
import { logger, serialiseError } from '@pkg/logger';
import { getClientIp, getUserAgent, hashIp, isSameOriginRequest } from '@pkg/security/request';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

type RouteContext<TParams> = { params: Promise<TParams> };

type AdminHandlerArgs<TParams> = {
  request: NextRequest;
  session: AdminSession;
  params: TParams;
};

type PublicHandlerArgs<TParams> = {
  request: NextRequest;
  params: TParams;
};

/**
 * Wraps an admin route handler with the three things every one of them needs.
 *
 *   1. Cross-site rejection on mutations, independent of cookie SameSite policy.
 *   2. The allowlist check — a valid Supabase session is not enough.
 *   3. A catch-all that logs the real error and returns a bare 500, so a stack
 *      trace or a query fragment never reaches the client.
 *
 * Applying these per-handler instead would mean every new route is one
 * forgotten line away from being unauthenticated.
 */
export function withAdmin<TParams = Record<string, never>>(
  handler: (args: AdminHandlerArgs<TParams>) => Promise<Response>,
) {
  return async (request: NextRequest, context?: RouteContext<TParams>): Promise<Response> => {
    try {
      if (MUTATING_METHODS.has(request.method) && !isSameOriginRequest(request)) {
        logger.warn('api.cross_site_rejected', {
          path: request.nextUrl.pathname,
          method: request.method,
        });
        return apiFail('FORBIDDEN', 'Cross-site request rejected');
      }

      const session = await requireAdmin();
      const params = ((await context?.params) ?? {}) as TParams;

      return await handler({ request, session, params });
    } catch (error) {
      return handleRouteError(error, {
        path: request.nextUrl.pathname,
        method: request.method,
      });
    }
  };
}

/** Same catch-all, no session. For the public read endpoints and /api/contact. */
export function withPublic<TParams = Record<string, never>>(
  handler: (args: PublicHandlerArgs<TParams>) => Promise<Response>,
) {
  return async (request: NextRequest, context?: RouteContext<TParams>): Promise<Response> => {
    try {
      const params = ((await context?.params) ?? {}) as TParams;
      return await handler({ request, params });
    } catch (error) {
      return handleRouteError(error, {
        path: request.nextUrl.pathname,
        method: request.method,
      });
    }
  };
}

type ParseResult<T> = { ok: true; data: T } | { ok: false; response: Response };

/**
 * Read and validate a JSON body.
 *
 * Returns a discriminated result rather than throwing so the handler stays a
 * straight line, and so a validation failure produces field-level messages the
 * admin form can render next to the offending input.
 */
export async function readJson<TSchema extends z.ZodTypeAny>(
  request: NextRequest,
  schema: TSchema,
): Promise<ParseResult<z.infer<TSchema>>> {
  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: apiFail('BAD_REQUEST', 'Request body must be valid JSON') };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, response: apiValidationFailed(parsed.error) };
  }

  return { ok: true, data: parsed.data };
}

/** Validate the query string of a GET endpoint. */
export function readQuery<TSchema extends z.ZodTypeAny>(
  request: NextRequest,
  schema: TSchema,
): ParseResult<z.infer<TSchema>> {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = schema.safeParse(params);

  if (!parsed.success) {
    return { ok: false, response: apiValidationFailed(parsed.error) };
  }

  return { ok: true, data: parsed.data };
}

type AuditInput = {
  request: NextRequest;
  session?: AdminSession | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGIN_FAILED' | 'LOGOUT';
  entityType: string;
  entityId?: string | null;
  diff?: Record<string, unknown> | null;
  /** For LOGIN_FAILED, where there is no session to name the actor. */
  actorEmail?: string | null;
};

/**
 * Append to the audit log.
 *
 * Never throws and never blocks the response: an audit write failing is worth
 * knowing about, but it is not worth turning a successful content edit into an
 * error the admin has to puzzle over.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.session?.adminUserId ?? null,
        actorEmail: input.session?.email ?? input.actorEmail ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        diff: (input.diff ?? undefined) as never,
        ipHash: hashIp(getClientIp(input.request)),
        userAgent: getUserAgent(input.request),
      },
    });
  } catch (error) {
    logger.error('audit.write_failed', {
      action: input.action,
      entityType: input.entityType,
      ...serialiseError(error),
    });
  }
}

/** Both locales, in a fixed order, for building Prisma nested writes. */
export const LOCALES = ['KA', 'EN'] as const;
