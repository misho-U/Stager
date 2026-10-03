import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';

import { AdminThemeProvider } from '@/shared/components/admin-theme-provider';
import { QueryProvider } from '@/shared/components/query-provider';
import { ADMIN_THEME_COOKIE, parseAdminTheme } from '@/shared/lib/admin-theme';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.metadata');

  return {
    title: t('title'),
    // The dashboard must never appear in search results, even if a URL leaks.
    robots: { index: false, follow: false, nocache: true },
  };
}

/**
 * Shared by the login page and the dashboard.
 *
 * No auth guard here on purpose — /admin/login lives under this layout, and
 * guarding at this level would redirect the login page to itself. The guard is
 * in (dashboard)/layout.tsx, which covers every authenticated route.
 *
 * The theme and the interface language are both read on the server, so the
 * first byte already has them. The provider hands client components the
 * messages pkg/i18n/request.ts loaded for the admin's chosen language.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const theme = parseAdminTheme((await cookies()).get(ADMIN_THEME_COOKIE)?.value);

  return (
    <NextIntlClientProvider>
      <AdminThemeProvider initialTheme={theme}>
        <QueryProvider>{children}</QueryProvider>
      </AdminThemeProvider>
    </NextIntlClientProvider>
  );
}
