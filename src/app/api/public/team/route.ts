import { readQuery, withPublic } from '@/app/api/_lib/route-helpers';
import { listPublicTeamMembers } from '@/app/api/_lib/repositories/team-member.repository';
import { listQuerySchema } from '@/app/api/public/_query';
import { apiOk } from '@pkg/http/api-response';

export const dynamic = 'force-dynamic';

export const GET = withPublic(async ({ request }) => {
  const query = readQuery(request, listQuerySchema);
  if (!query.ok) return query.response;

  const { locale, limit, offset } = query.data;
  return apiOk(await listPublicTeamMembers(locale, limit, offset));
});
