'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { adminLocaleCookie } from '@pkg/i18n/admin-locale';
import type { AppLocale } from '@pkg/i18n/routing';

/**
 * The dashboard's interface language, and how to change it.
 *
 * The words are rendered on the server from the cookie, so a change saves the
 * cookie and re-renders the page in place. A refresh rather than a reload:
 * client state survives it, including anything typed into a form.
 */
export function useAdminLocaleSwitch() {
  const current = useLocale() as AppLocale;
  const router = useRouter();
  const [isSwitching, startTransition] = useTransition();

  const choose = (locale: AppLocale) => {
    if (locale === current) return;
    document.cookie = adminLocaleCookie(locale, window.location.protocol === 'https:');
    startTransition(() => router.refresh());
  };

  return { current, choose, isSwitching };
}
