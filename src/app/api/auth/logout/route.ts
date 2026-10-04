import { recordAudit, withPublic } from '@/app/api/_lib/route-helpers';
import { getAdminSession } from '@pkg/auth/admin-session';
import { apiFail, apiOk } from '@pkg/http/api-response';
import { logger, serialiseError } from '@pkg/logger';
import { isSameOriginRequest } from '@pkg/security/request';
import { createSupabaseServerClient } from '@pkg/supabase/server';

export const dynamic = 'force-dynamic';

export const POST = withPublic(async ({ request }) => {
  if (!isSameOriginRequest(request)) {
    return apiFail('FORBIDDEN', 'Cross-site request rejected');
  }

  // Read the session before destroying it, so the audit entry has an actor.
  // Best effort: signing out must work while the database is down too, or the
  // cookies would outlive the click.
  const session = await getAdminSession().catch((error: unknown) => {
    logger.warn('auth.logout_session_unknown', serialiseError(error));
    return null;
  });

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  if (session) {
    await recordAudit({ request, session, action: 'LOGOUT', entityType: 'AdminUser' });
  }

  return apiOk({ ok: true as const });
});
