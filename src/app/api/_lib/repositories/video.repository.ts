import {
  fromCalendarDate,
  toCalendarDate,
  toIsoRequired,
  toTranslationMap,
  translationUpsert,
} from '@/app/api/_lib/serializers';
import type {
  AdminVideo,
  PublicVideo,
  VideoInput,
  VideoUpdateInput,
} from '@/entity/video/model/video.model';
import type { DbLocale } from '@/shared/types/enums';
import { prisma } from '@pkg/db/prisma';

const adminInclude = { translations: true } as const;

const EMPTY_TRANSLATION = { title: '', summary: '' };

type AdminRow = Awaited<
  ReturnType<typeof prisma.video.findFirstOrThrow<{ include: typeof adminInclude }>>
>;

function toAdminVideo(row: AdminRow): AdminVideo {
  return {
    id: row.id,
    slug: row.slug,
    youtubeUrl: row.youtubeUrl,
    kind: row.kind,
    publishedAt: toCalendarDate(row.publishedAt),
    durationMinutes: row.durationMinutes,
    status: row.status,
    createdAt: toIsoRequired(row.createdAt),
    updatedAt: toIsoRequired(row.updatedAt),
    translations: toTranslationMap(
      row.translations,
      (translation) => ({ title: translation.title, summary: translation.summary }),
      EMPTY_TRANSLATION,
    ),
  };
}

const NEWEST_FIRST = [{ publishedAt: 'desc' as const }, { createdAt: 'desc' as const }];

export async function listAdminVideos() {
  const rows = await prisma.video.findMany({ include: adminInclude, orderBy: NEWEST_FIRST });
  return { items: rows.map(toAdminVideo), total: rows.length };
}

export async function getAdminVideo(id: string) {
  const row = await prisma.video.findUnique({ where: { id }, include: adminInclude });
  return row ? toAdminVideo(row) : null;
}

export async function createVideo(input: VideoInput): Promise<AdminVideo> {
  const created = await prisma.video.create({
    data: {
      slug: input.slug,
      youtubeUrl: input.youtubeUrl,
      kind: input.kind,
      publishedAt: fromCalendarDate(input.publishedAt),
      durationMinutes: input.durationMinutes ?? null,
      status: input.status,
      translations: {
        create: (['KA', 'EN'] as const).map((locale) => ({
          locale,
          ...input.translations[locale],
        })),
      },
    },
    include: adminInclude,
  });

  return toAdminVideo(created);
}

export async function updateVideo(id: string, input: VideoUpdateInput): Promise<AdminVideo | null> {
  const existing = await prisma.video.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;

  const updated = await prisma.video.update({
    where: { id },
    data: {
      ...(input.slug === undefined ? {} : { slug: input.slug }),
      ...(input.youtubeUrl === undefined ? {} : { youtubeUrl: input.youtubeUrl }),
      ...(input.kind === undefined ? {} : { kind: input.kind }),
      ...(input.publishedAt === undefined
        ? {}
        : { publishedAt: fromCalendarDate(input.publishedAt) }),
      ...(input.durationMinutes === undefined
        ? {}
        : { durationMinutes: input.durationMinutes ?? null }),
      ...(input.status === undefined ? {} : { status: input.status }),
      ...(input.translations
        ? {
            translations: {
              upsert: translationUpsert(
                'videoId',
                id,
                'videoId_locale',
                input.translations,
              ) as never,
            },
          }
        : {}),
    },
    include: adminInclude,
  });

  return toAdminVideo(updated);
}

export async function deleteVideo(id: string): Promise<boolean> {
  const existing = await prisma.video.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;

  await prisma.video.delete({ where: { id } });
  return true;
}

// --- Public ---

/** Published videos, newest first. */
export async function listPublicVideos(locale: DbLocale, limit: number, offset: number) {
  const where = { status: 'PUBLISHED' as const };

  const [rows, total] = await Promise.all([
    prisma.video.findMany({
      where,
      include: { translations: { where: { locale } } },
      orderBy: NEWEST_FIRST,
      take: limit,
      skip: offset,
    }),
    prisma.video.count({ where }),
  ]);

  const items: PublicVideo[] = rows.map((row) => {
    const translation = row.translations[0];
    return {
      id: row.id,
      slug: row.slug,
      title: translation?.title ?? '',
      summary: translation?.summary ?? '',
      kind: row.kind,
      youtubeUrl: row.youtubeUrl,
      publishedAt: toCalendarDate(row.publishedAt),
      durationMinutes: row.durationMinutes,
    };
  });

  return { items, total };
}
