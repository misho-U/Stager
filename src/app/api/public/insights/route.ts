import { readQuery, withPublic } from '@/app/api/_lib/route-helpers';
import { listPublicInsights } from '@/app/api/_lib/repositories/insight.repository';
import { insightListQuerySchema } from '@/app/api/public/_query';
import { apiOk } from '@pkg/http/api-response';

export const dynamic = 'force-dynamic';

export const GET = withPublic(async ({ request }) => {
  const query = readQuery(request, insightListQuerySchema);
  if (!query.ok) return query.response;

  const { locale, limit, offset, category } = query.data;
  return apiOk(await listPublicInsights(locale, limit, offset, category));
});
