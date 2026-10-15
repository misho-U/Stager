import { queryOptions } from '@tanstack/react-query';

import { fetchDashboardCounts } from '@/entity/dashboard/api/dashboard.api';

/**
 * The overview's counts. Fetched in the browser, not with the page, so a page
 * the router kept from earlier never shows counts from before a save. Never
 * taken as current, since new inquiries arrive from the site: the overview
 * shows the last counts at once and asks again each time it opens.
 */
export const dashboardCountsQuery = () =>
  queryOptions({
    queryKey: ['dashboard', 'counts'] as const,
    queryFn: fetchDashboardCounts,
    staleTime: 0,
  });
