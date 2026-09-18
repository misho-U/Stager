import { withAdmin } from '@/app/api/_lib/route-helpers';
import { listAdminPages } from '@/app/api/_lib/repositories/page.repository';
import { apiOk } from '@pkg/http/api-response';

export const dynamic = 'force-dynamic';

/** Pages are seeded, not created — list only. */
export const GET = withAdmin(async () => apiOk(await listAdminPages()));
