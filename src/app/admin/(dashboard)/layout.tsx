import { redirect } from 'next/navigation';

import { AdminSidebar } from '@/widgets/admin-sidebar/admin-sidebar.module';
import { getAdminSession } from '@pkg/auth/admin-session';

/** Never cache a page rendered for a specific signed-in admin. */
export const dynamic = 'force-dynamic';

/**
 * The real authentication boundary.
 *
 * Middleware already bounced anonymous visitors, but it runs on Edge where
 * Prisma is unavailable, so it can only prove that *a* Supabase session exists.
 * This check runs in the Node runtime and is the one that consults the
 * AdminUser allowlist — an authenticated Supabase user who is not on it never
 * gets past here.
 *
 * Every route handler repeats the check independently. Defence here is for the
 * UI; defence there is for the data.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <AdminSidebar email={session.email} name={session.name} role={session.role} />
      <main className="min-w-0 flex-1 px-gutter py-6 lg:px-8 lg:py-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}
