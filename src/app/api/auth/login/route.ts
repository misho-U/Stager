import type { NextRequest } from 'next/server';

import { readJson, recordAudit, withPublic } from '@/app/api/_lib/route-helpers';
import { loginInputSchema } from '@/entity/session/model/session.model';
import { getAdminSession } from '@pkg/auth/admin-session';
import { apiFail, apiOk } from '@pkg/http/api-response';
import { logger } from '@pkg/logger';
import { checkRateLimit, RATE_LIMITS } from '@pkg/ratelimit/limiter';
import { getClientIp, hashIp, isSameOriginRequest } from '@pkg/security/request';
import { createSupabaseServerClient } from '@pkg/supabase/server';

/** Sessions are per-request; never let a CDN hold one. */
export const dynamic = 'force-dynamic';

/**
 * Sign in.
 *
 * Deliberately routed through our own endpoint rather than calling the Supabase
 * browser client directly, because three things have to happen server-side:
 * rate limiting, the AdminUser allowlist check, and the audit entry. A
 * client-side signIn would skip all three and would hand out a working session
 * cookie to any Supabase account that exists.
 */
export const POST = withPublic(async ({ request }: { request: NextRequest }) => {
  if (!isSameOriginRequest(request)) {
    return apiFail('FORBIDDEN', 'Cross-site request rejected');
  }

  const ipHash = hashIp(getClientIp(request)) ?? 'unknown';
  const limit = await checkRateLimit({ key: `login:${ipHash}`, ...RATE_LIMITS.login });

  if (!limit.ok) {
    return apiFail('RATE_LIMITED', 'Too many sign-in attempts. Please try again later.', {
      headers: { 'Retry-After': String(limit.retryAfterSeconds) },
    });
  }

  const parsed = await readJson(request, loginInputSchema);
  if (!parsed.ok) return parsed.response;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    await recordAudit({
      request,
      action: 'LOGIN_FAILED',
      entityType: 'AdminUser',
      actorEmail: parsed.data.email.toLowerCase(),
    });

    // One message for "no such user" and for "wrong password" alike — telling
    // them apart would confirm which addresses have accounts.
    return apiFail('UNAUTHENTICATED', 'Email or password is incorrect');
  }

  // Authenticated with Supabase, but that is only half the test.
  const session = await getAdminSession();

  if (!session) {
    // Valid credentials, not on the allowlist. Tear the session down rather
    // than leaving a cookie that would let them poke at admin routes.
    await supabase.auth.signOut();

    await recordAudit({
      request,
      action: 'LOGIN_FAILED',
      entityType: 'AdminUser',
      actorEmail: parsed.data.email.toLowerCase(),
      diff: { reason: 'not_on_allowlist' },
    });

    logger.warn('auth.login_not_allowlisted', { email: parsed.data.email.toLowerCase() });
    return apiFail('FORBIDDEN', 'This account is not permitted to use the dashboard');
  }

  await recordAudit({ request, session, action: 'LOGIN', entityType: 'AdminUser' });

  return apiOk({
    ok: true as const,
    session: {
      adminUserId: session.adminUserId,
      email: session.email,
      name: session.name,
      role: session.role,
    },
  });
});
