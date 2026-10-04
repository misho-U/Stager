import { readJson, recordAudit, withAdmin } from '@/app/api/_lib/route-helpers';
import {
  getSiteSettings,
  updateSiteSettings,
} from '@/app/api/_lib/repositories/site-setting.repository';
import { siteSettingUpdateInputSchema } from '@/entity/site-setting/model/site-setting.model';
import { requireOwner } from '@pkg/auth/admin-session';
import { revalidateEntity } from '@pkg/cache/revalidate';
import { apiOk } from '@pkg/http/api-response';

export const dynamic = 'force-dynamic';

/** A single row: no list, no create, no delete. */
export const GET = withAdmin(async () => apiOk(await getSiteSettings()));

/**
 * Owner only. Settings decide where every lead goes (the inquiry inbox), so an
 * editor account must not be able to point it at an address of its own; the
 * audit entry records the inbox before and after for the same reason.
 */
export const PATCH = withAdmin(async ({ request, session }) => {
  requireOwner(session);

  const parsed = await readJson(request, siteSettingUpdateInputSchema);
  if (!parsed.ok) return parsed.response;

  const before = await getSiteSettings();
  const settings = await updateSiteSettings(parsed.data);

  await recordAudit({
    request,
    session,
    action: 'UPDATE',
    entityType: 'SiteSetting',
    entityId: settings.id,
    diff: {
      before: {
        contactEmail: before.contactEmail,
        phone: before.phone,
        inquiryInboxEmail: before.inquiryInboxEmail,
      },
      after: {
        contactEmail: settings.contactEmail,
        phone: settings.phone,
        inquiryInboxEmail: settings.inquiryInboxEmail,
      },
    },
  });

  // Settings feed the header and footer, so this clears the layout tag too —
  // see tagsToRevalidate in pkg/cache/tags.
  revalidateEntity('siteSetting');

  return apiOk(settings);
});
