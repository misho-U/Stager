import { readQuery, withPublic } from '@/app/api/_lib/route-helpers';
import { getPublicService } from '@/app/api/_lib/repositories/service.repository';
import { localeQuerySchema } from '@/app/api/public/_query';
import { apiFail, apiOk } from '@pkg/http/api-response';

export const dynamic = 'force-dynamic';

export const GET = withPublic<{ slug: string }>(async ({ request, params }) => {
  const query = readQuery(request, localeQuerySchema);
  if (!query.ok) return query.response;

  const service = await getPublicService(params.slug, query.data.locale);
  if (!service) return apiFail('NOT_FOUND', 'Service not found');

  return apiOk(service);
});
