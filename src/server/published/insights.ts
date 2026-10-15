import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import type {
  PublicInsightDetail,
  PublicInsightListItem,
} from '@/entity/insight/model/insight.model';
import type { DbLocale } from '@/shared/types/enums';
import { collectionTag, CONTENT_CACHE_LIFE, detailTag } from '@pkg/cache/tags';
import { prisma } from '@pkg/db/prisma';
import { mediaInclude, toIso, toIsoRequired, toMediaSummary } from '@/server/published/serializers';

const publicInclude = (locale: DbLocale) =>
  ({
    coverMedia: mediaInclude,
    translations: { where: { locale }, include: { ogMedia: mediaInclude } },
    category: { include: { translations: { where: { locale } } } },
    author: { include: { translations: { where: { locale } } } },
  }) as const;

type PublicRow = {
  id: string;
  slug: string;
  showAuthor: boolean;
  readingMinutes: number | null;
  publishedAt: Date | null;
  updatedAt: Date;
  coverMedia: Parameters<typeof toMediaSummary>[0];
  translations: Array<{
    title: string;
    excerpt: string;
    body: string;
    metaTitle: string | null;
    metaDescription: string | null;
    ogMedia: { url: string } | null;
  }>;
  category: { slug: string; translations: Array<{ name: string }> } | null;
  author: { slug: string; status: string; translations: Array<{ name: string }> } | null;
};

function toPublicListItem(row: PublicRow, locale: DbLocale): PublicInsightListItem {
  const translation = row.translations[0];

  return {
    id: row.id,
    slug: row.slug,
    title: translation?.title ?? '',
    excerpt: translation?.excerpt ?? '',
    cover: toMediaSummary(row.coverMedia, locale),
    category: row.category
      ? { slug: row.category.slug, name: row.category.translations[0]?.name ?? '' }
      : null,
    // showAuthor === false means the article is published anonymously, so the
    // author must not leak through the API either — not just be hidden in the UI.
    // Nor may a team member who is not published: their name would appear, and
    // their link would lead nowhere.
    author:
      row.showAuthor && row.author && row.author.status === 'PUBLISHED'
        ? { slug: row.author.slug, name: row.author.translations[0]?.name ?? '' }
        : null,
    readingMinutes: row.readingMinutes,
    publishedAt: toIso(row.publishedAt),
    updatedAt: toIsoRequired(row.updatedAt),
  };
}

export async function listPublicInsights(
  locale: DbLocale,
  limit: number,
  offset: number,
  categorySlug?: string,
) {
  'use cache';
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(collectionTag('insight'));

  const where = {
    status: 'PUBLISHED' as const,
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.insight.findMany({
      where,
      include: publicInclude(locale),
      orderBy: [{ publishedAt: 'desc' }],
      take: limit,
      skip: offset,
    }),
    prisma.insight.count({ where }),
  ]);

  return { items: rows.map((row) => toPublicListItem(row as PublicRow, locale)), total };
}

export async function getPublicInsight(
  slug: string,
  locale: DbLocale,
): Promise<PublicInsightDetail | null> {
  'use cache';
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(collectionTag('insight'), detailTag('insight', slug));

  const row = await prisma.insight.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: publicInclude(locale),
  });

  if (!row) return null;

  const typed = row as PublicRow;
  const translation = typed.translations[0];

  return {
    ...toPublicListItem(typed, locale),
    body: translation?.body ?? '',
    metaTitle: translation?.metaTitle ?? null,
    metaDescription: translation?.metaDescription ?? null,
    ogImageUrl: translation?.ogMedia?.url ?? row.coverMedia?.url ?? null,
  };
}
