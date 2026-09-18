import { readQuery, withPublic } from '@/app/api/_lib/route-helpers';
import { getPublicProject } from '@/app/api/_lib/repositories/project.repository';
import { localeQuerySchema } from '@/app/api/public/_query';
import { apiFail, apiOk } from '@pkg/http/api-response';

export const dynamic = 'force-dynamic';

export const GET = withPublic<{ slug: string }>(async ({ request, params }) => {
  const query = readQuery(request, localeQuerySchema);
  if (!query.ok) return query.response;

  const project = await getPublicProject(params.slug, query.data.locale);
  if (!project) return apiFail('NOT_FOUND', 'Project not found');

  return apiOk(project);
});
