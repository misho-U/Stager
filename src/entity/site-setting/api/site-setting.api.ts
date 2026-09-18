import {
  adminSiteSettingSchema,
  type AdminSiteSetting,
  type SiteSettingUpdateInput,
} from '@/entity/site-setting/model/site-setting.model';
import { clientFetch } from '@pkg/http/fetcher';

/** A single row — there is nothing to list, create or delete. */
const BASE = '/api/admin/settings';

export async function fetchSiteSettings(): Promise<AdminSiteSetting> {
  const raw = await clientFetch<unknown>(BASE);
  return adminSiteSettingSchema.parse(raw);
}

export async function updateSiteSettings(
  input: SiteSettingUpdateInput,
): Promise<AdminSiteSetting> {
  const raw = await clientFetch<unknown>(BASE, { method: 'PATCH', body: input });
  return adminSiteSettingSchema.parse(raw);
}
