import type { Metadata } from 'next';

import { QueryProvider } from '@/shared/components/query-provider';

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
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
