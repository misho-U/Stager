import { withAdmin } from '@/app/api/_lib/route-helpers';
import { toIso, toIsoRequired } from '@/app/api/_lib/serializers';
import {
  INQUIRY_LIST_LIMIT,
  inquiryViewSchema,
  type AdminContactInquiry,
  type AdminContactInquiryList,
} from '@/entity/contact-inquiry/model/contact-inquiry.model';
import { prisma } from '@pkg/db/prisma';
import { apiOk } from '@pkg/http/api-response';

export const dynamic = 'force-dynamic';

const IN_INBOX = { status: { in: ['NEW' as const, 'READ' as const] } };
const ARCHIVED = { status: 'ARCHIVED' as const };

/**
 * The inquiry inbox: `?view=inbox` (new and read, the default) or
 * `?view=archived`. The newest INQUIRY_LIST_LIMIT of the view, with `total`
 * counting all of it, so the page can say when there are more than it shows.
 *
 * `ipHash` and `userAgent` are deliberately not selected: they exist for abuse
 * throttling, not for the dashboard to display, and there is no reason to ship
 * them to a browser.
 */
export const GET = withAdmin(async ({ request }) => {
  const view = inquiryViewSchema
    .catch('inbox')
    .parse(new URL(request.url).searchParams.get('view'));
  const where = view === 'archived' ? ARCHIVED : IN_INBOX;

  const [rows, inbox, archived, unread] = await Promise.all([
    prisma.contactInquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: INQUIRY_LIST_LIMIT,
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
    }),
    prisma.contactInquiry.count({ where: IN_INBOX }),
    prisma.contactInquiry.count({ where: ARCHIVED }),
    prisma.contactInquiry.count({ where: { status: 'NEW' } }),
  ]);

  const items: AdminContactInquiry[] = rows.map((row) => ({
    ...row,
    notifiedAt: toIso(row.notifiedAt),
    createdAt: toIsoRequired(row.createdAt),
  }));

  const body: AdminContactInquiryList = {
    items,
    total: view === 'archived' ? archived : inbox,
    counts: { inbox, archived, unread },
  };
  return apiOk(body);
});
