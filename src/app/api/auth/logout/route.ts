import { recordAudit, withPublic } from '@/app/api/_lib/route-helpers';
import { getAdminSession } from '@pkg/auth/admin-session';
import { apiFail, apiOk } from '@pkg/http/api-response';
import { isSameOriginRequest } from '@pkg/security/request';
import { createSupabaseServerClient } from '@pkg/supabase/server';

export const dynamic = 'force-dynamic';

export const POST = withPublic(async ({ request }) => {
  if (!isSameOriginRequest(request)) {
    return apiFail('FORBIDDEN', 'Cross-site request rejected');
  }

  // Read the session before destroying it, so the audit entry has an actor.
  const session = await getAdminSession();

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  if (session) {
    await recordAudit({ request, session, action: 'LOGOUT', entityType: 'AdminUser' });
  }

  return apiOk({ ok: true as const });
});
