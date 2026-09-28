'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { createAdminFormat } from '@/shared/lib/admin-format';

/** Dates and file sizes in the dashboard's language (see createAdminFormat). */
export function useAdminFormat() {
  const locale = useLocale();
  const t = useTranslations('admin.units');

  return useMemo(() => createAdminFormat(locale, t), [locale, t]);
}
