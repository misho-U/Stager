import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';

import '../globals.css';

import appleIcon from '@/shared/brandbook/images/apple-icon.png';
import icon from '@/shared/brandbook/images/icon.png';
import { THEME_COLOR } from '@/shared/brandbook/tokens';
import { AdminThemeProvider } from '@/shared/components/admin-theme-provider';
import { QueryProvider } from '@/shared/components/query-provider';
import { ADMIN_THEME_COOKIE, parseAdminTheme } from '@/shared/lib/admin-theme';
import { toCanonicalUrl } from '@pkg/http/site-url';

/**
 * Rendered per request, and allowed to wait for its cookies before the first
 * byte: the theme and the interface language (the admin's own choice, read
 * from cookies) decide `<html lang>` and the colours, so this layout has no
 * static shell to build. Reading cookies costs no round trip. What does, the
 * sign-in check, waits inside a Suspense boundary in (dashboard)/layout.tsx.
 */
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.metadata');

  return {
    metadataBase: new URL(toCanonicalUrl('/')),
    title: t('title'),
    // The dashboard must never appear in search results, even if a URL leaks.
    robots: { index: false, follow: false, nocache: true },
    icons: {
      icon: [{ url: icon.src, type: 'image/png', sizes: `${icon.width}x${icon.height}` }],
      apple: [{ url: appleIcon.src, sizes: `${appleIcon.width}x${appleIcon.height}` }],
    },
  };
}

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
  width: 'device-width',
  initialScale: 1,
};

/**
 * The dashboard's root layout, shared by the login page and the dashboard.
 * The public site has its own (app/[locale]/layout.tsx), built ahead of time.
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
  const [cookieStore, locale] = await Promise.all([cookies(), getLocale()]);
  const theme = parseAdminTheme(cookieStore.get(ADMIN_THEME_COOKIE)?.value);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="bg-surface text-ink min-h-dvh antialiased">
        <NextIntlClientProvider>
          <AdminThemeProvider initialTheme={theme}>
            <QueryProvider>{children}</QueryProvider>
          </AdminThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
