'use client';

import { useTranslations } from 'next-intl';

import {
  CONTENT_STATUSES,
  COURSE_FORMATS,
  SOCIAL_PLATFORMS,
  VIDEO_KINDS,
} from '@/shared/types/enums';

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

export function useCourseFormatOptions() {
  const t = useTranslations('admin.courseFormats');
  return COURSE_FORMATS.map((format) => ({ value: format, label: t(format) }));
}

export function useVideoKindOptions() {
  const t = useTranslations('admin.videoKinds');
  return VIDEO_KINDS.map((kind) => ({ value: kind, label: t(kind) }));
}
