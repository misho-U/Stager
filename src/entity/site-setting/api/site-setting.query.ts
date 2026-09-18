import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  fetchSiteSettings,
  updateSiteSettings,
} from '@/entity/site-setting/api/site-setting.api';
import type { SiteSettingUpdateInput } from '@/entity/site-setting/model/site-setting.model';

export const siteSettingKeys = {
  all: ['site-settings'] as const,
};

export const siteSettingsQuery = () =>
  queryOptions({ queryKey: siteSettingKeys.all, queryFn: fetchSiteSettings });

export function useUpdateSiteSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SiteSettingUpdateInput) => updateSiteSettings(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: siteSettingKeys.all }),
  });
}
