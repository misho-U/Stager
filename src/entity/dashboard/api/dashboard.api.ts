import {
  dashboardCountsSchema,
  type DashboardCounts,
} from '@/entity/dashboard/model/dashboard.model';
import { clientFetch } from '@pkg/http/fetcher';

export async function fetchDashboardCounts(): Promise<DashboardCounts> {
  return dashboardCountsSchema.parse(await clientFetch<unknown>('/api/admin/stats'));
}
