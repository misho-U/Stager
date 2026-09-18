import { withAdmin } from '@/app/api/_lib/route-helpers';
import { apiOk } from '@pkg/http/api-response';

export const dynamic = 'force-dynamic';

/**
 * Who am I?
 *
 * Wrapped in withAdmin, so an unauthenticated caller gets 401 and a
 * non-allowlisted one gets 403 — which is also how the dashboard shell decides
 * whether to render or bounce to the login page.
 */
export const GET = withAdmin(async ({ session }) =>
  apiOk({
    adminUserId: session.adminUserId,
    email: session.email,
    name: session.name,
    role: session.role,
  }),
);
