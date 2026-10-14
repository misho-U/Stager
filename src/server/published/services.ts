import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import type { PublicService, PublicServiceListItem } from '@/entity/service/model/service.model';
import type { DbLocale } from '@/shared/types/enums';
import { collectionTag, CONTENT_CACHE_LIFE, detailTag } from '@pkg/cache/tags';
import { prisma } from '@pkg/db/prisma';
import { mediaInclude, toMediaSummary } from '@/server/published/serializers';

export async function listPublicServices(locale: DbLocale, limit: number, offset: number) {
  'use cache';
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(collectionTag('service'));

  const where = { status: 'PUBLISHED' as const };

  const [rows, total] = await Promise.all([
    // No bodies: the list shows a title and a short description; a body is
    // for the service's own page (getPublicService).
    prisma.service.findMany({
      where,
      include: {
        coverMedia: mediaInclude,
        translations: { where: { locale }, omit: { body: true } },
      },
      orderBy: { order: 'asc' },
      take: limit,
      skip: offset,
    }),
    prisma.service.count({ where }),
  ]);

  const items: PublicServiceListItem[] = rows.map((row) => {
    const translation = row.translations[0];
    return {
      id: row.id,
      slug: row.slug,
      icon: row.icon,
      title: translation?.title ?? '',
      shortDescription: translation?.shortDescription ?? '',
      cover: toMediaSummary(row.coverMedia, locale),
      metaTitle: translation?.metaTitle ?? null,
      metaDescription: translation?.metaDescription ?? null,
    };
  });

  return { items, total };
}

export async function getPublicService(
  slug: string,
  locale: DbLocale,
): Promise<PublicService | null> {
  'use cache';
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(collectionTag('service'), detailTag('service', slug));

  const row = await prisma.service.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: { coverMedia: mediaInclude, translations: { where: { locale } } },
  });

  if (!row) return null;

  const translation = row.translations[0];

  return {
    id: row.id,
    slug: row.slug,
    icon: row.icon,
    title: translation?.title ?? '',
    shortDescription: translation?.shortDescription ?? '',
    body: translation?.body ?? '',
    cover: toMediaSummary(row.coverMedia, locale),
    metaTitle: translation?.metaTitle ?? null,
    metaDescription: translation?.metaDescription ?? null,
  };
}
