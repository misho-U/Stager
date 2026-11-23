import { isAuthRetryableFetchError } from '@supabase/supabase-js';

import { readJson, recordAudit, withAdmin } from '@/app/api/_lib/route-helpers';
import { passwordChangeInputSchema } from '@/entity/session/model/session.model';
import { apiFail, apiOk } from '@pkg/http/api-response';
import { logger } from '@pkg/logger';
import { checkRateLimit, RATE_LIMITS } from '@pkg/ratelimit/limiter';
import {
  createSupabaseDetachedClient,
  createSupabaseServerClient,
  getSupabaseUser,
} from '@pkg/supabase/server';

/**
 * Changes the signed-in admin's password (Settings → Password).
 *
 * 1. The current password is checked on a client of its own, so a wrong one
 *    never touches the browser's session, and a laptop left signed in cannot
 *    be used to lock the owner out.
 * 2. The new one is set through the session that check just opened: Supabase
 *    may ask for a recent sign-in before a password change, and that one is
 *    seconds old.
 * 3. This browser signs in again with the new password, and every other
 *    session of the account (another device, the check above) is ended: a
 *    password changed because it leaked leaves nobody else signed in.
 */
export const POST = withAdmin(async ({ request, session }) => {
  const limit = await checkRateLimit({
    key: `password-change:${session.adminUserId}`,
    ...RATE_LIMITS.passwordChange,
  });
  if (!limit.ok) {
    return apiFail('RATE_LIMITED', 'Too many attempts. Please try again later.', {
      reason: 'RATE_LIMITED',
      headers: { 'Retry-After': String(limit.retryAfterSeconds) },
    });
  }

  const parsed = await readJson(request, passwordChangeInputSchema);
  if (!parsed.ok) return parsed.response;
  const { currentPassword, newPassword } = parsed.data;

  // The account's own address, as Supabase holds it: the one it signs in with.
  const user = await getSupabaseUser();
  if (!user?.email) return apiFail('UNAUTHENTICATED', 'Not signed in');
  const email = user.email;

  const check = createSupabaseDetachedClient();
  const { data: checked, error: checkError } = await check.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (checkError || checked.user?.id !== user.id) {
    if (checkError && (isAuthRetryableFetchError(checkError) || !checkError.status)) {
      return apiFail('INTERNAL', 'Could not reach the authentication service.', {
        reason: 'AUTH_UNREACHABLE',
      });
    }
    if (checkError?.code === 'over_request_rate_limit') {
      return apiFail('RATE_LIMITED', 'Supabase is throttling sign-in attempts. Wait a minute.', {
        reason: 'PROVIDER_RATE_LIMITED',
      });
    }
    await recordAudit({
      request,
      session,
      action: 'LOGIN_FAILED',
      entityType: 'AdminUser',
      entityId: session.adminUserId,
      diff: { reason: 'password_change_wrong_current' },
    });
    return apiFail('BAD_REQUEST', 'The current password is not right.', {
      reason: 'WRONG_PASSWORD',
      fields: { currentPassword: ['The current password is not right.'] },
    });
  }

  const { error: updateError } = await check.auth.updateUser({ password: newPassword });
  if (updateError) {
    // Supabase's own password rules (a common or leaked password, when its
    // project settings ask for that): the new one has to change.
    if (updateError.code === 'weak_password' || updateError.code === 'same_password') {
      return apiFail('BAD_REQUEST', 'Choose a different new password.', {
        reason: 'WEAK_PASSWORD',
        fields: { newPassword: ['Choose a different new password.'] },
      });
    }
    throw updateError;
  }

  await recordAudit({
    request,
    session,
    action: 'UPDATE',
    entityType: 'AdminUser',
    entityId: session.adminUserId,
    // That it changed, never what to.
    diff: { password: 'changed' },
  });

  // This browser carries on with a session from the new password; then every
  // other one ends. Should either step fail, the password has still changed,
  // and saying otherwise would send the owner to change it again.
  const browser = await createSupabaseServerClient();
  const { error: renewError } = await browser.auth.signInWithPassword({
    email,
    password: newPassword,
  });
  if (renewError) {
    logger.error('auth.password_change_renew_failed', {
      supabaseCode: renewError.code ?? null,
      supabaseStatus: renewError.status ?? null,
    });
  } else {
    const { error: othersError } = await browser.auth.signOut({ scope: 'others' });
    if (othersError) {
      logger.error('auth.password_change_signout_others_failed', {
        supabaseCode: othersError.code ?? null,
        supabaseStatus: othersError.status ?? null,
      });
    }
  }

  return apiOk({ changed: true as const });
});
