import { cookies } from 'next/headers';

import { AdminDashboardModule } from '@/modules/admin-dashboard/admin-dashboard.module';
import { getAdminSession } from '@pkg/auth/admin-session';
import { serverFetchAuthed } from '@pkg/http/fetcher';
import { logger, serialiseError } from '@pkg/logger';

export const dynamic = 'force-dynamic';

type Stats = {
  projects: number;
  insights: number;
  services: number;
  courses: number;
  videos: number;
  teamMembers: number;
  newInquiries: number;
};

export default async function AdminDashboardPage() {
  const session = await getAdminSession();

  // Server components fetch their own API rather than querying directly — see
  // the data-access rule in AGENTS.md. The auth cookies are forwarded so the
  // route's own requireAdmin check passes.
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  let stats: Stats | null = null;
  try {
    stats = await serverFetchAuthed<Stats>('/api/admin/stats', cookieHeader);
  } catch (error) {
    // A stats failure must not take down the whole dashboard, and every other
    // screen still works. The counts show as unknown: zeroes read as "all your
    // content is gone".
    logger.error('admin.stats_failed', serialiseError(error));
  }

  return <AdminDashboardModule name={session?.name ?? null} counts={stats} />;
}
