import {
  mediaInclude,
  toIsoRequired,
  toMediaSummary,
  toTranslationMap,
  translationUpsert,
} from '@/app/api/_lib/serializers';
import type {
  AdminTeamMember,
  PublicTeamMember,
  TeamMemberInput,
  TeamMemberUpdateInput,
} from '@/entity/team-member/model/team-member.model';
import type { DbLocale } from '@/shared/types/enums';
import { prisma } from '@pkg/db/prisma';
import { sanitizeRichText } from '@pkg/security/sanitize';

const adminInclude = { photoMedia: mediaInclude, translations: true } as const;

const EMPTY_TRANSLATION = { name: '', position: '', bio: '', expertise: '' };

type AdminRow = Awaited<
  ReturnType<typeof prisma.teamMember.findFirstOrThrow<{ include: typeof adminInclude }>>
>;

function toAdminTeamMember(row: AdminRow): AdminTeamMember {
  return {
    id: row.id,
    slug: row.slug,
    photoMediaId: row.photoMediaId,
    photoMedia: toMediaSummary(row.photoMedia),
    email: row.email,
    linkedinUrl: row.linkedinUrl,
    status: row.status,
    order: row.order,
    createdAt: toIsoRequired(row.createdAt),
    updatedAt: toIsoRequired(row.updatedAt),
    translations: toTranslationMap(
      row.translations,
      (translation) => ({
        name: translation.name,
        position: translation.position,
        bio: translation.bio,
        expertise: translation.expertise,
      }),
      EMPTY_TRANSLATION,
    ),
  };
}

function sanitized(translations: TeamMemberInput['translations']) {
  return {
    KA: { ...translations.KA, bio: sanitizeRichText(translations.KA.bio ?? '') },
    EN: { ...translations.EN, bio: sanitizeRichText(translations.EN.bio ?? '') },
  };
}

/** Empty strings from an untouched optional form field mean "not set". */
function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  return value.trim() === '' ? null : value;
}

export async function listAdminTeamMembers() {
  const rows = await prisma.teamMember.findMany({
    include: adminInclude,
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
  return { items: rows.map(toAdminTeamMember), total: rows.length };
}

export async function getAdminTeamMember(id: string) {
  const row = await prisma.teamMember.findUnique({ where: { id }, include: adminInclude });
  return row ? toAdminTeamMember(row) : null;
}

export async function createTeamMember(input: TeamMemberInput): Promise<AdminTeamMember> {
  const translations = sanitized(input.translations);

  const created = await prisma.teamMember.create({
    data: {
      slug: input.slug,
      photoMediaId: input.photoMediaId ?? null,
      email: emptyToNull(input.email),
      linkedinUrl: emptyToNull(input.linkedinUrl),
      status: input.status,
      order: input.order,
      translations: {
        create: (['KA', 'EN'] as const).map((locale) => ({ locale, ...translations[locale] })),
      },
    },
    include: adminInclude,
  });

  return toAdminTeamMember(created);
}

export async function updateTeamMember(
  id: string,
  input: TeamMemberUpdateInput,
): Promise<AdminTeamMember | null> {
  const existing = await prisma.teamMember.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;

  const translations = input.translations ? sanitized(input.translations) : null;

  const updated = await prisma.teamMember.update({
    where: { id },
    data: {
      ...(input.slug === undefined ? {} : { slug: input.slug }),
      ...(input.photoMediaId === undefined ? {} : { photoMediaId: input.photoMediaId ?? null }),
      ...(input.email === undefined ? {} : { email: emptyToNull(input.email) }),
      ...(input.linkedinUrl === undefined ? {} : { linkedinUrl: emptyToNull(input.linkedinUrl) }),
      ...(input.status === undefined ? {} : { status: input.status }),
      ...(input.order === undefined ? {} : { order: input.order }),
      ...(translations
        ? {
            translations: {
              upsert: translationUpsert(
                'teamMemberId',
                id,
                'teamMemberId_locale',
                translations,
              ) as never,
            },
          }
        : {}),
    },
    include: adminInclude,
  });

  return toAdminTeamMember(updated);
}

export async function deleteTeamMember(id: string): Promise<boolean> {
  const existing = await prisma.teamMember.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;

  // Insights authored by this person keep their attribution nulled, not deleted
  // — see onDelete: SetNull on Insight.authorId.
  await prisma.teamMember.delete({ where: { id } });
  return true;
}

// --- Public ---

export async function listPublicTeamMembers(locale: DbLocale, limit: number, offset: number) {
  const where = { status: 'PUBLISHED' as const };

  const [rows, total] = await Promise.all([
    prisma.teamMember.findMany({
      where,
      include: { photoMedia: mediaInclude, translations: { where: { locale } } },
      orderBy: { order: 'asc' },
      take: limit,
      skip: offset,
    }),
    prisma.teamMember.count({ where }),
  ]);

  const items: PublicTeamMember[] = rows.map((row) => {
    const translation = row.translations[0];
    return {
      id: row.id,
      slug: row.slug,
      name: translation?.name ?? '',
      position: translation?.position ?? '',
      bio: translation?.bio ?? '',
      expertise: translation?.expertise ?? '',
      photo: toMediaSummary(row.photoMedia, locale),
      linkedinUrl: row.linkedinUrl,
    };
  });

  return { items, total };
}
