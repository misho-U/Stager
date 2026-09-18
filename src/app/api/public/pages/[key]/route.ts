import { readQuery, withPublic } from '@/app/api/_lib/route-helpers';
import { getPublicPage } from '@/app/api/_lib/repositories/page.repository';
import { localeQuerySchema } from '@/app/api/public/_query';
import { pageKeySchema } from '@/shared/types/enums';
import { apiFail, apiOk } from '@pkg/http/api-response';

export const dynamic = 'force-dynamic';

export const GET = withPublic<{ key: string }>(async ({ request, params }) => {
  const query = readQuery(request, localeQuerySchema);
  if (!query.ok) return query.response;

  const key = pageKeySchema.safeParse(params.key.toUpperCase());
  if (!key.success) return apiFail('NOT_FOUND', 'Unknown page');

  const page = await getPublicPage(key.data, query.data.locale);
  if (!page) return apiFail('NOT_FOUND', 'Page not found');

  return apiOk(page);
});
