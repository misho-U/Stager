import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { cache } from 'react';

import { INSIGHTS_PATH } from '@/entity/insight/model/insight.model';
import { pageIntro, pageName } from '@/entity/page/model/page.model';
import type { DbLocale } from '@/shared/types/enums';
import { toAppLocale } from '@pkg/i18n/routing';
import { listPublicInsights } from '@/server/published/insights';
import { getPublicPage } from '@/server/published/pages';
import { descriptionFor, pageMetadata, siteSeo, titleFor } from '@/widgets/seo/seo.service';
import { breadcrumbNode, structuredData, type JsonLdNode } from '@/widgets/seo/seo.utils';
import { loadSiteChrome } from '@/widgets/site-chrome/site-chrome.service';

/** How many articles the page lists, newest first (the API's maximum). */
const INSIGHTS_LIMIT = 100;

/**
 * The articles page's reads: its heading and line (Page copy → Insights) and
 * every published article (dashboard → Insights), newest first, through the
 * published layer (cached and tagged; a failed read is not caught, see
 * widgets/site-chrome). Once per render (React `cache`), for the page and its
 * metadata alike.
 */
export const loadInsightsPageData = cache(async (locale: DbLocale) => {
  const [chrome, page, insights] = await Promise.all([
    loadSiteChrome(locale),
    getPublicPage('INSIGHTS', locale),
    listPublicInsights(locale, INSIGHTS_LIMIT, 0),
  ]);

  return { chrome, page, insights: insights.items };
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
