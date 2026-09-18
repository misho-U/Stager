import { readQuery, withPublic } from '@/app/api/_lib/route-helpers';
import { getPublicLayoutData } from '@/app/api/_lib/repositories/site-setting.repository';
import { localeQuerySchema } from '@/app/api/public/_query';
import { apiOk } from '@pkg/http/api-response';

/**
 * The route reads the database on every call; caching happens one level up, in
 * the server component that fetches it with a cache tag. That keeps a single
 * invalidation mechanism (revalidateTag) rather than two competing ones.
 */
export const dynamic = 'force-dynamic';

export const GET = withPublic(async ({ request }) => {
  const query = readQuery(request, localeQuerySchema);
  if (!query.ok) return query.response;

  return apiOk(await getPublicLayoutData(query.data.locale));
});
