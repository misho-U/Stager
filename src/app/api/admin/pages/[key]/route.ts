import { readJson, recordAudit, withAdmin } from '@/app/api/_lib/route-helpers';
import { getAdminPage, updateAdminPage } from '@/app/api/_lib/repositories/page.repository';
import { pageUpdateInputSchema } from '@/entity/page/model/page.model';
import { pageKeySchema } from '@/shared/types/enums';
import { revalidateEntity } from '@pkg/cache/revalidate';
import { apiFail, apiOk } from '@pkg/http/api-response';

export const dynamic = 'force-dynamic';

type Params = { key: string };

export const GET = withAdmin<Params>(async ({ params }) => {
  const key = pageKeySchema.safeParse(params.key);
  if (!key.success) return apiFail('NOT_FOUND', 'Unknown page');

  const page = await getAdminPage(key.data);
  if (!page) return apiFail('NOT_FOUND', 'Page not found');

  return apiOk(page);
});

export const PATCH = withAdmin<Params>(async ({ request, session, params }) => {
  const key = pageKeySchema.safeParse(params.key);
  if (!key.success) return apiFail('NOT_FOUND', 'Unknown page');

  const parsed = await readJson(request, pageUpdateInputSchema);
  if (!parsed.ok) return parsed.response;

  const page = await updateAdminPage(key.data, parsed.data);
  if (!page) return apiFail('NOT_FOUND', 'Page not found');

  await recordAudit({
    request,
    session,
    action: 'UPDATE',
    entityType: 'Page',
    entityId: page.id,
    diff: { after: { key: page.key, sections: page.sections.length } },
  });

  revalidateEntity('page', page.key);

  return apiOk(page);
});
