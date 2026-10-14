import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import type { PublicVideo } from '@/entity/video/model/video.model';
import type { DbLocale } from '@/shared/types/enums';
import { collectionTag, CONTENT_CACHE_LIFE } from '@pkg/cache/tags';
import { prisma } from '@pkg/db/prisma';
import { toCalendarDate } from '@/server/published/serializers';

const NEWEST_FIRST = [{ publishedAt: 'desc' as const }, { createdAt: 'desc' as const }];

/** Published videos, newest first. */
export async function listPublicVideos(locale: DbLocale, limit: number, offset: number) {
  'use cache';
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(collectionTag('video'));

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
