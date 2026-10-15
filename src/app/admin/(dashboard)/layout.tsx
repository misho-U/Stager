import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { CONTENT_ID } from '@/shared/components/skip-link';
import { AdminNoAccess } from '@/widgets/admin-no-access/admin-no-access.module';
import { AdminShellPending } from '@/widgets/admin-shell-pending/admin-shell-pending.module';
import { AdminSidebar } from '@/widgets/admin-sidebar/admin-sidebar.module';
import { getAdminAccess } from '@pkg/auth/admin-session';

/**
 * The real authentication boundary, checked on every request.
 *
 * Middleware already bounced anonymous visitors, but it runs on Edge where
 * Prisma is unavailable, so it can only prove that *a* Supabase session exists.
 * This check runs in the Node runtime and is the one that consults the
 * AdminUser allowlist — an authenticated Supabase user who is not on it never
 * gets past here.
 *
 * It waits inside a Suspense boundary: the check asks Supabase and the
 * database, and the page around it need not wait for either. Nothing inside
 * renders before it passes: the sidebar and the page are children of the
 * checked branch, and the fallback holds nothing of the admin's.
 *
 * Someone signed in but not allowed is told so, with a way to sign out, rather
 * than sent to the login page: middleware sends anyone with a session from
 * there straight back here, and the two used to bounce a deactivated admin
 * between them until the browser gave up.
 *
 * Every route handler repeats the check independently. Defence here is for the
 * UI; defence there is for the data.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AdminShellPending />}>
      <SignedInDashboard>{children}</SignedInDashboard>
    </Suspense>
  );
}

async function SignedInDashboard({ children }: { children: React.ReactNode }) {
  const access = await getAdminAccess();

  if (access.state === 'anonymous') {
    redirect('/admin/login');
  }

  if (access.state === 'denied') {
    return <AdminNoAccess email={access.email} />;
  }

  const { session } = access;

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <AdminSidebar email={session.email} name={session.name} role={session.role} />
      <main id={CONTENT_ID} tabIndex={-1} className="px-gutter min-w-0 flex-1 py-6 lg:px-8 lg:py-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}
