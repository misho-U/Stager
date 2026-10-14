import { readQuery, withPublic } from '@/app/api/_lib/route-helpers';
import { getPublicLayoutData } from '@/server/published/site';
import { localeQuerySchema } from '@/app/api/public/_query';
import { apiOk } from '@pkg/http/api-response';

/**
 * Reads through the published layer (src/server/published), the same cached,
 * tagged read the pages use, so one invalidation (revalidateTag on save)
 * refreshes both.
 */
export const GET = withPublic(async ({ request }) => {
  const query = readQuery(request, localeQuerySchema);
  if (!query.ok) return query.response;

  return apiOk(await getPublicLayoutData(query.data.locale));
});
