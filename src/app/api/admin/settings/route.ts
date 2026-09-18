import { readJson, recordAudit, withAdmin } from '@/app/api/_lib/route-helpers';
import {
  getSiteSettings,
  updateSiteSettings,
} from '@/app/api/_lib/repositories/site-setting.repository';
import { siteSettingUpdateInputSchema } from '@/entity/site-setting/model/site-setting.model';
import { revalidateEntity } from '@pkg/cache/revalidate';
import { apiOk } from '@pkg/http/api-response';

export const dynamic = 'force-dynamic';

/** A single row: no list, no create, no delete. */
export const GET = withAdmin(async () => apiOk(await getSiteSettings()));

export const PATCH = withAdmin(async ({ request, session }) => {
  const parsed = await readJson(request, siteSettingUpdateInputSchema);
  if (!parsed.ok) return parsed.response;

  const settings = await updateSiteSettings(parsed.data);

  await recordAudit({
    request,
    session,
    action: 'UPDATE',
    entityType: 'SiteSetting',
    entityId: settings.id,
    diff: { after: { contactEmail: settings.contactEmail, phone: settings.phone } },
  });

  // Settings feed the header and footer, so this clears the layout tag too —
  // see tagsToRevalidate in pkg/cache/tags.
  revalidateEntity('siteSetting');

  return apiOk(settings);
});
