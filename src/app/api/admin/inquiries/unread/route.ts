import { withAdmin } from '@/app/api/_lib/route-helpers';
import { prisma } from '@pkg/db/prisma';
import { apiOk } from '@pkg/http/api-response';

export const dynamic = 'force-dynamic';

/**
 * How many inquiries no one has marked read: the sidebar's badge. Asked for
 * on every dashboard page, so one count and nothing more.
 */
export const GET = withAdmin(async () =>
  apiOk({ count: await prisma.contactInquiry.count({ where: { status: 'NEW' } }) }),
);
