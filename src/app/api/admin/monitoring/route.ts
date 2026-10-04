import { withAdmin } from '@/app/api/_lib/route-helpers';
import { requireOwner } from '@pkg/auth/admin-session';
import { apiOk } from '@pkg/http/api-response';
import { MONITORING_ON } from '@pkg/monitoring/options';
import { reportServerError } from '@pkg/monitoring/server';

export const dynamic = 'force-dynamic';

/**
 * Sends Sentry a test error, so the owner can see reporting work after
 * setting it up (Settings → Error reporting). Says whether anything was sent:
 * while reporting is off, nothing is.
 */
export const POST = withAdmin(async ({ session }) => {
  requireOwner(session);
  if (MONITORING_ON) {
    reportServerError(new Error('Test error sent from the dashboard: error reporting works.'), {
      adminUserId: session.adminUserId,
    });
  }
  return apiOk({ sent: MONITORING_ON });
});
