import { toIsoRequired } from '@/app/api/_lib/serializers';
import type {
  AdminSocialLink,
  PublicSocialLink,
  SocialLinkInput,
  SocialLinkUpdateInput,
} from '@/entity/social-link/model/social-link.model';
import { prisma } from '@pkg/db/prisma';

type Row = Awaited<ReturnType<typeof prisma.socialLink.findFirstOrThrow>>;

function toAdminSocialLink(row: Row): AdminSocialLink {
  return {
    id: row.id,
    platform: row.platform,
    url: row.url,
    label: row.label,
    order: row.order,
    isActive: row.isActive,
    createdAt: toIsoRequired(row.createdAt),
    updatedAt: toIsoRequired(row.updatedAt),
  };
}

export async function listAdminSocialLinks() {
  const rows = await prisma.socialLink.findMany({ orderBy: { order: 'asc' } });
  return { items: rows.map(toAdminSocialLink), total: rows.length };
}

export async function getAdminSocialLink(id: string) {
  const row = await prisma.socialLink.findUnique({ where: { id } });
  return row ? toAdminSocialLink(row) : null;
}

export async function createSocialLink(input: SocialLinkInput): Promise<AdminSocialLink> {
  const created = await prisma.socialLink.create({
    data: {
      platform: input.platform,
      url: input.url,
      label: input.label ?? null,
      order: input.order,
      isActive: input.isActive,
    },
  });

  return toAdminSocialLink(created);
}

export async function updateSocialLink(
  id: string,
  input: SocialLinkUpdateInput,
): Promise<AdminSocialLink | null> {
  const existing = await prisma.socialLink.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;

  const updated = await prisma.socialLink.update({
    where: { id },
    data: {
      ...(input.platform === undefined ? {} : { platform: input.platform }),
      ...(input.url === undefined ? {} : { url: input.url }),
      ...(input.label === undefined ? {} : { label: input.label ?? null }),
      ...(input.order === undefined ? {} : { order: input.order }),
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
    },
  });

  return toAdminSocialLink(updated);
}

export async function deleteSocialLink(id: string): Promise<boolean> {
  const existing = await prisma.socialLink.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;

  await prisma.socialLink.delete({ where: { id } });
  return true;
}

/** Only the active links, and without the timestamps. */
export async function listPublicSocialLinks(): Promise<PublicSocialLink[]> {
  const rows = await prisma.socialLink.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
    select: { id: true, platform: true, url: true, label: true },
  });

  return rows;
}
