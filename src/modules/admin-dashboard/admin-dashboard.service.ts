'use client';

import { useQuery } from '@tanstack/react-query';

import { dashboardCountsQuery } from '@/entity/dashboard/api/dashboard.query';

/**
 * The overview's counts: unknown while they first load, kept on screen while
 * they are asked for again, and failed only when there are none to show.
 */
export function useDashboardCounts() {
  const { data, isPending, error } = useQuery(dashboardCountsQuery());
  return { counts: data ?? null, isLoading: isPending, failed: Boolean(error) && !data };
}
