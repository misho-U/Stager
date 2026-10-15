import { readQuery, withPublic } from '@/app/api/_lib/route-helpers';
import { getPublicInsight } from '@/server/published/insights';
import { localeQuerySchema } from '@/app/api/public/_query';
import { apiFail, apiOk } from '@pkg/http/api-response';

export const GET = withPublic<{ slug: string }>(async ({ request, params }) => {
  const query = readQuery(request, localeQuerySchema);
  if (!query.ok) return query.response;

  const insight = await getPublicInsight(params.slug, query.data.locale);
  if (!insight) return apiFail('NOT_FOUND', 'Article not found');

  return apiOk(insight);
});
