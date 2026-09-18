import { withAdmin } from '@/app/api/_lib/route-helpers';
import { prisma } from '@pkg/db/prisma';
import { apiOk } from '@pkg/http/api-response';

export const dynamic = 'force-dynamic';

/** Counts for the dashboard landing page. */
export const GET = withAdmin(async () => {
  const [projects, insights, services, teamMembers, newInquiries] = await Promise.all([
    prisma.project.count(),
    prisma.insight.count(),
    prisma.service.count(),
    prisma.teamMember.count(),
    prisma.contactInquiry.count({ where: { status: 'NEW' } }),
  ]);

  return apiOk({ projects, insights, services, teamMembers, newInquiries });
});
