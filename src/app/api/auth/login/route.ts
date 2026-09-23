import type { NextRequest } from 'next/server';

import { isAuthRetryableFetchError } from '@supabase/supabase-js';

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
      diff: { reason: error.code ?? error.name },
    });

    // Always log what Supabase actually said. Without this the server log shows
    // a bare 401 and whoever is setting the site up has no way to tell a wrong
    // password from an account that was never created.
    logger.warn('auth.login_rejected', {
      email: parsed.data.email.toLowerCase(),
      supabaseCode: error.code ?? null,
      supabaseStatus: error.status ?? null,
      supabaseMessage: error.message,
    });

    // A transport failure is not a credential failure. Reporting it as one
    // sends the operator hunting for a password problem when the real fault is
    // NEXT_PUBLIC_SUPABASE_URL or a network block.
    if (isAuthRetryableFetchError(error) || !error.status) {
      return apiFail(
        'INTERNAL',
        'Could not reach the authentication service. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.',
      );
    }

    // The request reached Supabase but landed on a path that does not exist —
    // which means the URL is wrong, not the password. This is what a
    // NEXT_PUBLIC_SUPABASE_URL carrying a `/rest/v1/` suffix produces: the
    // client appends /auth/v1/token to it and Supabase replies 404 "Invalid
    // path specified in request URL". Reported as a credential failure it cost
    // three rounds of debugging a password that was always correct.
    if (error.status === 404 || /invalid path|not found/i.test(error.message)) {
      return apiFail(
        'INTERNAL',
        'The authentication service rejected the request path, which means NEXT_PUBLIC_SUPABASE_URL is wrong. It must be the bare origin — https://<project-ref>.supabase.co, with no /rest/v1 or other path. Run `pnpm setup:check`.',
      );
    }

    // Setup mistakes get named, because the person hitting them is the one who
    // can fix them, and nothing is disclosed that an operator does not know.
    // Matched on the message as well as the code: GoTrue's shape varies with
    // version and provider settings, and an unconfirmed account reported as a
    // bad password sends the operator off to reset a password that was fine.
    if (error.code === 'email_not_confirmed' || /email not confirmed/i.test(error.message)) {
      return apiFail(
        'UNAUTHENTICATED',
        'This account exists but its email is not confirmed. Tick "Auto Confirm User" when creating it, or run `pnpm admin:set-password`.',
      );
    }

    if (error.code === 'over_request_rate_limit') {
      return apiFail('RATE_LIMITED', 'Supabase is throttling sign-in attempts. Wait a minute.');
    }

    // Everything else stays one message: telling "no such user" apart from
    // "wrong password" would confirm which addresses have accounts.
    return apiFail(
      'UNAUTHENTICATED',
      'Email or password is incorrect. Run `pnpm setup:check` to check the account, or `pnpm admin:set-password` to set a known one.',
    );
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
