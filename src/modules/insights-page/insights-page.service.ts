import type { PublicInsightListItem } from '@/entity/insight/model/insight.model';
import type { ListResponse } from '@/shared/types/api';
import type { DbLocale } from '@/shared/types/enums';
import { collectionTag, PUBLIC_REVALIDATE_SECONDS } from '@pkg/cache/tags';
import { serverFetch } from '@pkg/http/fetcher';
import { loadSiteChrome, readPage, readPublic } from '@/widgets/site-chrome/site-chrome.service';

/** How many articles the page lists, newest first (the API's maximum). */
const INSIGHTS_LIMIT = 100;

/**
 * The articles page's reads: its heading and line (Page copy → Insights) and
 * every published article (dashboard → Insights), newest first. Tagged like
 * every public read (widgets/site-chrome).
 */
export async function loadInsightsPageData(locale: DbLocale) {
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
}
