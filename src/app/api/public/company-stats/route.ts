import { readQuery, withPublic } from '@/app/api/_lib/route-helpers';
import { listPublicStats } from '@/server/published/stats';
import { localeQuerySchema } from '@/app/api/public/_query';
import { apiOk } from '@pkg/http/api-response';

export const GET = withPublic(async ({ request }) => {
  const query = readQuery(request, localeQuerySchema);
  if (!query.ok) return query.response;

  return apiOk(await listPublicStats(query.data.locale));
});
