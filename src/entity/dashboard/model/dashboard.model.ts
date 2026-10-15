import { z } from 'zod';

/** The counts on the dashboard's overview (GET /api/admin/stats). */
export const dashboardCountsSchema = z.object({
  projects: z.number().int().nonnegative(),
  insights: z.number().int().nonnegative(),
  services: z.number().int().nonnegative(),
  courses: z.number().int().nonnegative(),
  videos: z.number().int().nonnegative(),
  teamMembers: z.number().int().nonnegative(),
  newInquiries: z.number().int().nonnegative(),
});

export type DashboardCounts = z.infer<typeof dashboardCountsSchema>;
