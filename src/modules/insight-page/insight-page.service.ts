import type { Metadata } from 'next';
import { cache } from 'react';

import {
  INSIGHTS_PATH,
  insightPath,
  type PublicInsightDetail,
  type PublicInsightListItem,
} from '@/entity/insight/model/insight.model';
import type { ListResponse } from '@/shared/types/api';
import { SLUG_PATTERN } from '@/shared/types/api';
import type { DbLocale } from '@/shared/types/enums';
import { collectionTag, detailTag, PUBLIC_REVALIDATE_SECONDS } from '@pkg/cache/tags';
import { ApiError } from '@pkg/http/api-error';
import { serverFetch } from '@pkg/http/fetcher';
import { descriptionFor, pageMetadata, siteSeo, titleFor } from '@/widgets/seo/seo.service';
import {
  articleNode,
  breadcrumbNode,
  structuredData,
  type JsonLdNode,
} from '@/widgets/seo/seo.utils';
import { loadSiteChrome, readPublic } from '@/widgets/site-chrome/site-chrome.service';

/** How many other articles an article suggests at its end. */
const MORE_COUNT = 3;

/**
 * One published article, or null where there is none by that address (a
 * draft, a deleted one, a mistyped link): the page is then a 404, not a
 * failed read. Tagged with the article's slug, the key every save of it
 * revalidates (app/api/admin/insights).
 */
export function readInsight(locale: DbLocale, slug: string): Promise<PublicInsightDetail | null> {
  if (!SLUG_PATTERN.test(slug)) return Promise.resolve(null);
  return serverFetch<PublicInsightDetail>(`/api/public/insights/${slug}?locale=${locale}`, {
    tags: [collectionTag('insight'), detailTag('insight', slug)],
    revalidate: PUBLIC_REVALIDATE_SECONDS,
  }).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  });
}

/** Once per request (React `cache`), for the page and its metadata alike. */
export const loadInsightPageData = cache(async (locale: DbLocale, slug: string) => {
  const [chrome, article, latest] = await Promise.all([
    loadSiteChrome(locale),
    readPublic('insight', readInsight(locale, slug), null),
    readPublic<ListResponse<PublicInsightListItem>>(
      'insights:more',
      serverFetch<ListResponse<PublicInsightListItem>>(
        `/api/public/insights?locale=${locale}&limit=${MORE_COUNT + 1}`,
        { tags: [collectionTag('insight')], revalidate: PUBLIC_REVALIDATE_SECONDS },
      ),
      { items: [], total: 0 },
    ),
  ]);

  return {
    chrome,
    article: article.data,
    /** No such article: a 404. A failed read is not that; the page says it failed. */
    missing: article.data === null && !article.failed,
    more: latest.data.items.filter((item) => item.slug !== slug).slice(0, MORE_COUNT),
    readFailed: article.failed || latest.failed,
  };
});

/**
 * The article's own search title and description (written with it in the
 * dashboard), its cover as the share card, and its date. No article by that
 * address: the page is a 404, never indexed.
 */
export async function loadInsightPageMetadata(locale: DbLocale, slug: string): Promise<Metadata> {
  const { chrome, article } = await loadInsightPageData(locale, slug);
  if (!article) return { robots: { index: false, follow: false } };
  const site = siteSeo(chrome.layout);
  const ownImage = article.ogImageUrl
    ? { url: article.ogImageUrl }
    : article.cover
      ? {
          url: article.cover.url,
          width: article.cover.width,
          height: article.cover.height,
          alt: article.cover.alt,
        }
      : null;
  return pageMetadata({
    locale,
    path: insightPath(slug),
    site,
    title: titleFor(article.metaTitle, article.title, site),
    description: descriptionFor([article.metaDescription, article.excerpt], site),
    image: ownImage,
    hasContent: true,
    article: {
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      section: article.category?.name ?? null,
    },
  });
}

/** The article for search engines and AI answers, and the way here from home. */
export function insightStructuredData(
  { chrome, article }: Awaited<ReturnType<typeof loadInsightPageData>>,
  locale: DbLocale,
  slug: string,
  names: { home: string; insights: string },
): JsonLdNode | null {
  if (!article) return null;
  const site = siteSeo(chrome.layout);
  const path = insightPath(slug);
  return structuredData([
    articleNode({ article, locale, path, site, layout: chrome.layout }),
    breadcrumbNode(locale, [
      { name: names.home, path: '' },
      { name: names.insights, path: INSIGHTS_PATH },
      { name: article.title, path },
    ]),
  ]);
}
