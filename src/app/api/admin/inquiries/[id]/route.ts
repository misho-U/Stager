import { readJson, recordAudit, withAdmin } from '@/app/api/_lib/route-helpers';
import { toIso, toIsoRequired } from '@/app/api/_lib/serializers';
import { inquiryStatusUpdateSchema } from '@/entity/contact-inquiry/model/contact-inquiry.model';
import { prisma } from '@pkg/db/prisma';
import { apiFail, apiNoContent, apiOk } from '@pkg/http/api-response';

export const dynamic = 'force-dynamic';

type Params = { id: string };

const selection = {
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
} as const;

/** Mark read / archived. Inquiry content itself is never editable. */
export const PATCH = withAdmin<Params>(async ({ request, session, params }) => {
  const parsed = await readJson(request, inquiryStatusUpdateSchema);
  if (!parsed.ok) return parsed.response;

  const existing = await prisma.contactInquiry.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!existing) return apiFail('NOT_FOUND', 'Inquiry not found');

  const row = await prisma.contactInquiry.update({
    where: { id: params.id },
    data: { status: parsed.data.status },
    select: selection,
  });

  await recordAudit({
    request,
    session,
    action: 'UPDATE',
    entityType: 'ContactInquiry',
    entityId: row.id,
    diff: { after: { status: row.status } },
  });

  // Inquiries are not public content — nothing cached depends on them.
  return apiOk({
    ...row,
    notifiedAt: toIso(row.notifiedAt),
    createdAt: toIsoRequired(row.createdAt),
  });
});

export const DELETE = withAdmin<Params>(async ({ request, session, params }) => {
  const existing = await prisma.contactInquiry.findUnique({
    where: { id: params.id },
    select: { id: true, email: true },
  });
  if (!existing) return apiFail('NOT_FOUND', 'Inquiry not found');

  await prisma.contactInquiry.delete({ where: { id: params.id } });

  await recordAudit({
    request,
    session,
    action: 'DELETE',
    entityType: 'ContactInquiry',
    entityId: params.id,
  });

  return apiNoContent();
});
