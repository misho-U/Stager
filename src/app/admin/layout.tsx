import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { AdminThemeProvider } from '@/shared/components/admin-theme-provider';
import { QueryProvider } from '@/shared/components/query-provider';
import { ADMIN_THEME_COOKIE, parseAdminTheme } from '@/shared/lib/admin-theme';

export const metadata: Metadata = {
  title: 'Admin',
  // The dashboard must never appear in search results, even if a URL leaks.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Shared by the login page and the dashboard.
 *
 * No auth guard here on purpose — /admin/login lives under this layout, and
 * guarding at this level would redirect the login page to itself. The guard is
 * in (dashboard)/layout.tsx, which covers every authenticated route.
 *
 * The theme is read here, on the server, so the first byte already has it.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const theme = parseAdminTheme((await cookies()).get(ADMIN_THEME_COOKIE)?.value);

  return (
    <AdminThemeProvider initialTheme={theme}>
      <QueryProvider>{children}</QueryProvider>
    </AdminThemeProvider>
  );
}
