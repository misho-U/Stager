import {
  fromCalendarDate,
  mediaInclude,
  toCalendarDate,
  toIsoRequired,
  toMediaSummary,
  toTranslationMap,
  translationUpsert,
} from '@/app/api/_lib/serializers';
import type { StoredVideoFile, VideoWrite } from '@/app/api/_lib/uploaded-video';
import type { AdminVideo, VideoInput, VideoUpdateInput } from '@/entity/video/model/video.model';
import { deleteBlob } from '@pkg/blob/storage';
import { prisma } from '@pkg/db/prisma';

const adminInclude = { translations: true, posterMedia: mediaInclude } as const;

const EMPTY_TRANSLATION = { title: '', summary: '' };

type AdminRow = Awaited<
  ReturnType<typeof prisma.video.findFirstOrThrow<{ include: typeof adminInclude }>>
>;

function toAdminVideo(row: AdminRow): AdminVideo {
  return {
    id: row.id,
    slug: row.slug,
    youtubeUrl: row.youtubeUrl,
    file:
      row.fileUrl && row.fileContentType && row.fileSize !== null
        ? { url: row.fileUrl, contentType: row.fileContentType, size: row.fileSize }
        : null,
    posterMediaId: row.posterMediaId,
    posterMedia: toMediaSummary(row.posterMedia),
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

/** The file columns for a stored file, or all null to remove it. */
function fileColumns(file: StoredVideoFile | null) {
  return {
    fileUrl: file?.url ?? null,
    filePathname: file?.pathname ?? null,
    fileContentType: file?.contentType ?? null,
    fileSize: file?.size ?? null,
  };
}

/**
 * What a write does to the video's source. A video plays a file or a YouTube
 * link, never both: setting one clears the other, so a write through the API
 * that names only one cannot leave both behind.
 */
function sourceColumns(input: { youtubeUrl?: string | null; file?: StoredVideoFile | null }) {
  const columns: Record<string, unknown> = {};
  if (input.file !== undefined) {
    Object.assign(columns, fileColumns(input.file));
    if (input.file) columns.youtubeUrl = null;
  }
  if (input.youtubeUrl !== undefined) {
    columns.youtubeUrl = input.youtubeUrl;
    if (input.youtubeUrl && input.file === undefined) Object.assign(columns, fileColumns(null));
  }
  return columns;
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

export async function createVideo(input: VideoWrite<VideoInput>): Promise<AdminVideo> {
  const created = await prisma.video.create({
    data: {
      slug: input.slug,
      youtubeUrl: input.youtubeUrl,
      ...fileColumns(input.file ?? null),
      posterMediaId: input.posterMediaId ?? null,
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

export async function updateVideo(
  id: string,
  input: VideoWrite<VideoUpdateInput>,
): Promise<AdminVideo | null> {
  const existing = await prisma.video.findUnique({ where: { id }, select: { fileUrl: true } });
  if (!existing) return null;

  const updated = await prisma.video.update({
    where: { id },
    data: {
      ...(input.slug === undefined ? {} : { slug: input.slug }),
      ...sourceColumns(input),
      ...(input.posterMediaId === undefined ? {} : { posterMediaId: input.posterMediaId ?? null }),
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

  // The file the video no longer plays, once the database no longer points
  // at it. Best-effort: a file left behind costs cents, one deleted too soon
  // breaks the site.
  if (existing.fileUrl && existing.fileUrl !== updated.fileUrl) await deleteBlob(existing.fileUrl);

  return toAdminVideo(updated);
}

export async function deleteVideo(id: string): Promise<boolean> {
  const existing = await prisma.video.findUnique({ where: { id }, select: { fileUrl: true } });
  if (!existing) return false;

  await prisma.video.delete({ where: { id } });
  if (existing.fileUrl) await deleteBlob(existing.fileUrl);
  return true;
}
