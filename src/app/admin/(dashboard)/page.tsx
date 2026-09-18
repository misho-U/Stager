import { cookies } from 'next/headers';

import { AdminDashboardModule } from '@/modules/admin-dashboard/admin-dashboard.module';
import { getAdminSession } from '@pkg/auth/admin-session';
import { serverFetchAuthed } from '@pkg/http/fetcher';

export const dynamic = 'force-dynamic';

type Stats = {
  projects: number;
  insights: number;
  services: number;
  teamMembers: number;
  newInquiries: number;
};

const EMPTY_STATS: Stats = {
  projects: 0,
  insights: 0,
  services: 0,
  teamMembers: 0,
  newInquiries: 0,
};

export default async function AdminDashboardPage() {
  const session = await getAdminSession();

  // Server components fetch their own API rather than querying directly — see
  // the data-access rule in AGENTS.md. The auth cookies are forwarded so the
  // route's own requireAdmin check passes.
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  let stats = EMPTY_STATS;
  try {
    stats = await serverFetchAuthed<Stats>('/api/admin/stats', cookieHeader);
  } catch {
    // A stats failure must not take down the whole dashboard; zeroes are
    // obviously wrong rather than misleading, and every other screen still works.
  }

  return <AdminDashboardModule name={session?.name ?? null} counts={stats} />;
}
