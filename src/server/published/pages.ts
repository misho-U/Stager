import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import type { PublicPage } from '@/entity/page/model/page.model';
import type { DbLocale, PageKey } from '@/shared/types/enums';
import { collectionTag, CONTENT_CACHE_LIFE, detailTag } from '@pkg/cache/tags';
import { isUnknownEnumValue } from '@pkg/db/errors';
import { prisma } from '@pkg/db/prisma';
import { mediaInclude, toMediaSummary } from '@/server/published/serializers';

/**
 * A lookup by page key that treats a key the database's enum does not hold
 * yet as no page (see isUnknownEnumValue): a preview of a new page, running
 * against the live database before its migration, finds nothing rather than
 * failing every page that asks.
 */
async function byKey<T>(lookup: () => Promise<T | null>): Promise<T | null> {
  try {
    return await lookup();
  } catch (error) {
    if (isUnknownEnumValue(error)) return null;
    throw error;
  }
}

export async function getPublicPage(key: PageKey, locale: DbLocale): Promise<PublicPage | null> {
  'use cache';
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(collectionTag('page'), detailTag('page', key));

  const row = await byKey(() =>
    prisma.page.findUnique({
      where: { key },
      include: {
        translations: { where: { locale }, include: { ogMedia: mediaInclude } },
        sections: {
          where: { isVisible: true },
          orderBy: { order: 'asc' },
          include: { media: mediaInclude, translations: { where: { locale } } },
        },
      },
    }),
  );

  if (!row) return null;

  const translation = row.translations[0];

  return {
    key: row.key,
    title: translation?.title ?? '',
    metaTitle: translation?.metaTitle ?? null,
    metaDescription: translation?.metaDescription ?? null,
    ogImageUrl: translation?.ogMedia?.url ?? null,
    sections: row.sections.map((section) => {
      const sectionTranslation = section.translations[0];
      return {
        key: section.key,
        heading: sectionTranslation?.heading ?? '',
        subheading: sectionTranslation?.subheading ?? '',
        body: sectionTranslation?.body ?? '',
        ctaLabel: sectionTranslation?.ctaLabel ?? '',
        ctaHref: sectionTranslation?.ctaHref ?? '',
        media: toMediaSummary(section.media, locale),
      };
    }),
  };
}
