import { withAdmin } from '@/app/api/_lib/route-helpers';
import { toIso, toIsoRequired } from '@/app/api/_lib/serializers';
import type { AdminContactInquiry } from '@/entity/contact-inquiry/model/contact-inquiry.model';
import { prisma } from '@pkg/db/prisma';
import { apiOk } from '@pkg/http/api-response';

export const dynamic = 'force-dynamic';

/**
 * The inquiry inbox.
 *
 * `ipHash` and `userAgent` are deliberately not selected: they exist for abuse
 * throttling, not for the dashboard to display, and there is no reason to ship
 * them to a browser.
 */
export const GET = withAdmin(async () => {
  const rows = await prisma.contactInquiry.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: {
      id: true,
      name: true,
      company: true,
      email: true,
      phone: true,
      interest: true,
      message: true,
      locale: true,
      status: true,
      notifiedAt: true,
      createdAt: true,
    },
  });

  const items: AdminContactInquiry[] = rows.map((row) => ({
    ...row,
    notifiedAt: toIso(row.notifiedAt),
    createdAt: toIsoRequired(row.createdAt),
  }));

  return apiOk({ items, total: items.length });
});
