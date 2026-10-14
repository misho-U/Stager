import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { cache } from 'react';

import { INSIGHTS_PATH, type PublicInsightListItem } from '@/entity/insight/model/insight.model';
import { pageIntro, pageName } from '@/entity/page/model/page.model';
import type { ListResponse } from '@/shared/types/api';
import type { DbLocale } from '@/shared/types/enums';
import { collectionTag, PUBLIC_REVALIDATE_SECONDS } from '@pkg/cache/tags';
import { serverFetch } from '@pkg/http/fetcher';
import { toAppLocale } from '@pkg/i18n/routing';
import { descriptionFor, pageMetadata, siteSeo, titleFor } from '@/widgets/seo/seo.service';
import { breadcrumbNode, structuredData, type JsonLdNode } from '@/widgets/seo/seo.utils';
import { loadSiteChrome, readPage, readPublic } from '@/widgets/site-chrome/site-chrome.service';

/** How many articles the page lists, newest first (the API's maximum). */
const INSIGHTS_LIMIT = 100;

/**
 * The articles page's reads: its heading and line (Page copy → Insights) and
 * every published article (dashboard → Insights), newest first. Tagged like
 * every public read (widgets/site-chrome); once per request (React `cache`),
 * for the page and its metadata alike.
 */
export const loadInsightsPageData = cache(async (locale: DbLocale) => {
  const [chrome, page, insights] = await Promise.all([
    loadSiteChrome(locale),
    readPublic('page:INSIGHTS', readPage('INSIGHTS', locale), null),
    readPublic<ListResponse<PublicInsightListItem>>(
      'insights',
      serverFetch<ListResponse<PublicInsightListItem>>(
        `/api/public/insights?locale=${locale}&limit=${INSIGHTS_LIMIT}`,
        { tags: [collectionTag('insight')], revalidate: PUBLIC_REVALIDATE_SECONDS },
      ),
      { items: [], total: 0 },
    ),
  ]);

  return {
    chrome,
    page: page.data,
    insights: insights.data.items,
    readFailed: page.failed || insights.failed,
  };
});

/** The page's search title, description and share card; indexed once an article is published. */
export async function loadInsightsPageMetadata(locale: DbLocale): Promise<Metadata> {
  const [{ chrome, page, insights }, t] = await Promise.all([
    loadInsightsPageData(locale),
    getTranslations({ locale: toAppLocale(locale) }),
  ]);
  const site = siteSeo(chrome.layout);
  return pageMetadata({
    locale,
    path: INSIGHTS_PATH,
    site,
    title: titleFor(page?.metaTitle, pageName(page, t('nav.insights')), site),
    description: descriptionFor([page?.metaDescription, pageIntro(page).lead], site),
    image: page?.ogImageUrl ? { url: page.ogImageUrl } : null,
    hasContent: insights.length > 0,
  });
}

/** The way here from the home page. */
export function insightsStructuredData(
  { page }: Awaited<ReturnType<typeof loadInsightsPageData>>,
  locale: DbLocale,
  names: { home: string; insights: string },
): JsonLdNode {
  return structuredData([
    breadcrumbNode(locale, [
      { name: names.home, path: '' },
      { name: pageName(page, names.insights), path: INSIGHTS_PATH },
    ]),
  ]);
}
