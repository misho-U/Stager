import { readQuery, withPublic } from '@/app/api/_lib/route-helpers';
import { listPublicProjects } from '@/server/published/projects';
import { listQuerySchema } from '@/app/api/public/_query';
import { apiOk } from '@pkg/http/api-response';

export const GET = withPublic(async ({ request }) => {
  const query = readQuery(request, listQuerySchema);
  if (!query.ok) return query.response;

  const { locale, limit, offset } = query.data;
  return apiOk(await listPublicProjects(locale, limit, offset));
});
