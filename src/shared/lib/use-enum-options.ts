'use client';

import { useTranslations } from 'next-intl';

import { CONTENT_STATUSES, SOCIAL_PLATFORMS } from '@/shared/types/enums';

/**
 * Select options for the enums admin forms offer, labelled in the dashboard's
 * language. They live in shared because several modules need them, and a
 * module may not import from another module.
 */
export function useStatusOptions() {
  const t = useTranslations('admin.statusOptions');
  return CONTENT_STATUSES.map((status) => ({ value: status, label: t(status) }));
}

/** Brand names are spelled as each brand does ("LinkedIn", "TikTok"). */
export function useSocialPlatformOptions() {
  const t = useTranslations('admin.platforms');
  return SOCIAL_PLATFORMS.map((platform) => ({ value: platform, label: t(platform) }));
}
