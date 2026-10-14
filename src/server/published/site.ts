import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import type { PublicLayoutData } from '@/entity/site-setting/model/site-setting.model';
import type { PublicSocialLink } from '@/entity/social-link/model/social-link.model';
import type { DbLocale } from '@/shared/types/enums';
import { collectionTag, CONTENT_CACHE_LIFE, LAYOUT_TAG } from '@pkg/cache/tags';
import { prisma } from '@pkg/db/prisma';
import { mediaInclude, toMediaSummary } from '@/server/published/serializers';

const SINGLETON_ID = 'singleton';

/** Only the active links, and without the timestamps. */
export async function listPublicSocialLinks(): Promise<PublicSocialLink[]> {
  'use cache';
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(LAYOUT_TAG, collectionTag('socialLink'));

  const rows = await prisma.socialLink.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
    select: { id: true, platform: true, url: true, label: true },
  });

  return rows;
}

/** Everything the header and footer need, in one cached read. */
export async function getPublicLayoutData(locale: DbLocale): Promise<PublicLayoutData> {
  'use cache';
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(LAYOUT_TAG, collectionTag('siteSetting'));

  const [row, socialLinks] = await Promise.all([
    prisma.siteSetting.findUnique({
      where: { id: SINGLETON_ID },
      include: {
        logoMedia: mediaInclude,
        logoLightMedia: mediaInclude,
        translations: { where: { locale } },
      },
    }),
    listPublicSocialLinks(),
  ]);

  const translation = row?.translations[0];

  return {
    siteName: translation?.siteName ?? 'STAGER',
    tagline: translation?.tagline ?? '',
    footerText: translation?.footerText ?? '',
    address: translation?.address ?? '',
    contactEmail: row?.contactEmail ?? null,
    phone: row?.phone ?? null,
    logo: toMediaSummary(row?.logoMedia, locale),
    logoLight: toMediaSummary(row?.logoLightMedia, locale),
    metaTitle: translation?.metaTitle ?? null,
    metaDescription: translation?.metaDescription ?? null,
    socialLinks,
  };
}
