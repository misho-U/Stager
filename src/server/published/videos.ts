import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import type { PublicVideo } from '@/entity/video/model/video.model';
import type { DbLocale } from '@/shared/types/enums';
import { collectionTag, CONTENT_CACHE_LIFE } from '@pkg/cache/tags';
import { isMissingColumn } from '@pkg/db/errors';
import { prisma } from '@pkg/db/prisma';
import { mediaInclude, toCalendarDate, toMediaSummary } from '@/server/published/serializers';

const NEWEST_FIRST = [{ publishedAt: 'desc' as const }, { createdAt: 'desc' as const }];

/** Published videos, newest first. */
export async function listPublicVideos(locale: DbLocale, limit: number, offset: number) {
  'use cache';
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(collectionTag('video'));

  const where = { status: 'PUBLISHED' as const };

  const query = { where, orderBy: NEWEST_FIRST, take: limit, skip: offset };
  const [rows, total] = await Promise.all([
    prisma.video
      .findMany({
        ...query,
        include: { translations: { where: { locale } }, posterMedia: mediaInclude },
      })
      .catch(async (error: unknown) => {
        // A preview of the change that added uploaded files, built against
        // the live database before its migration has run: the new columns
        // are not there yet, so the videos are read as they were before,
        // YouTube links only (isMissingColumn). Production migrates first.
        if (!isMissingColumn(error)) throw error;
        const legacy = await prisma.video.findMany({
          ...query,
          select: {
            id: true,
            slug: true,
            kind: true,
            youtubeUrl: true,
            publishedAt: true,
            durationMinutes: true,
            translations: { where: { locale } },
          },
        });
        return legacy.map((row) => ({ ...row, fileUrl: null, posterMedia: null }));
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
      fileUrl: row.fileUrl,
      poster: toMediaSummary(row.posterMedia, locale),
      publishedAt: toCalendarDate(row.publishedAt),
      durationMinutes: row.durationMinutes,
    };
  });

  return { items, total };
}
