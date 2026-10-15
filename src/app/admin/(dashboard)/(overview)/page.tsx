import { AdminDashboardModule } from '@/modules/admin-dashboard/admin-dashboard.module';
import { getAdminSession } from '@pkg/auth/admin-session';

/**
 * The overview. Only the greeting's name comes with the page; the counts load
 * in the browser (entity/dashboard), so a copy of this page the router kept
 * never shows counts from before a save.
 */
export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  return <AdminDashboardModule name={session?.name ?? null} />;
}
