import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import type {
  PublicProjectDetail,
  PublicProjectListItem,
} from '@/entity/project/model/project.model';
import type { DbLocale } from '@/shared/types/enums';
import { collectionTag, CONTENT_CACHE_LIFE, detailTag } from '@pkg/cache/tags';
import { prisma } from '@pkg/db/prisma';
import { mediaInclude, toIso, toMediaSummary } from '@/server/published/serializers';

const publicInclude = (locale: DbLocale) =>
  ({
    coverMedia: mediaInclude,
    translations: { where: { locale }, include: { ogMedia: mediaInclude } },
    gallery: { orderBy: { order: 'asc' }, include: { media: mediaInclude } },
    // Only published services: a draft's title and slug must not reach the
    // site through a project that links to it.
    services: {
      where: { service: { status: 'PUBLISHED' } },
      include: { service: { include: { translations: { where: { locale } } } } },
    },
  }) as const;

/** A project's gallery as the site shows it: in order, missing images left out. */
function toGallery(
  gallery: ReadonlyArray<{ media: Parameters<typeof toMediaSummary>[0] }>,
  locale: DbLocale,
) {
  return gallery
    .map((item) => toMediaSummary(item.media, locale))
    .filter((media): media is NonNullable<typeof media> => media !== null);
}

export async function listPublicProjects(locale: DbLocale, limit: number, offset: number) {
  'use cache';
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(collectionTag('project'));

  const where = { status: 'PUBLISHED' as const };

  const [rows, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: publicInclude(locale),
      orderBy: [{ featured: 'desc' }, { order: 'asc' }, { publishedAt: 'desc' }],
      take: limit,
      skip: offset,
    }),
    prisma.project.count({ where }),
  ]);

  const items: PublicProjectListItem[] = rows.map((row) => {
    const translation = row.translations[0];
    return {
      id: row.id,
      slug: row.slug,
      title: translation?.title ?? '',
      summary: translation?.summary ?? '',
      cover: toMediaSummary(row.coverMedia, locale),
      year: row.year,
      location: row.location,
      client: row.client,
      featured: row.featured,
      publishedAt: toIso(row.publishedAt),
      gallery: toGallery(row.gallery, locale),
    };
  });

  return { items, total };
}

export async function getPublicProject(
  slug: string,
  locale: DbLocale,
): Promise<PublicProjectDetail | null> {
  'use cache';
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(collectionTag('project'), detailTag('project', slug));

  const row = await prisma.project.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: publicInclude(locale),
  });

  if (!row) return null;

  const translation = row.translations[0];

  return {
    id: row.id,
    slug: row.slug,
    title: translation?.title ?? '',
    summary: translation?.summary ?? '',
    body: translation?.body ?? '',
    cover: toMediaSummary(row.coverMedia, locale),
    year: row.year,
    location: row.location,
    client: row.client,
    featured: row.featured,
    publishedAt: toIso(row.publishedAt),
    youtubeUrl: row.youtubeUrl,
    gallery: toGallery(row.gallery, locale),
    metaTitle: translation?.metaTitle ?? null,
    metaDescription: translation?.metaDescription ?? null,
    ogImageUrl: translation?.ogMedia?.url ?? row.coverMedia?.url ?? null,
    services: row.services.map((link) => ({
      slug: link.service.slug,
      title: link.service.translations[0]?.title ?? '',
    })),
  };
}
