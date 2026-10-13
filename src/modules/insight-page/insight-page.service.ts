import type {
  PublicInsightDetail,
  PublicInsightListItem,
} from '@/entity/insight/model/insight.model';
import type { ListResponse } from '@/shared/types/api';
import { SLUG_PATTERN } from '@/shared/types/api';
import type { DbLocale } from '@/shared/types/enums';
import { collectionTag, detailTag, PUBLIC_REVALIDATE_SECONDS } from '@pkg/cache/tags';
import { ApiError } from '@pkg/http/api-error';
import { serverFetch } from '@pkg/http/fetcher';
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

export async function loadInsightPageData(locale: DbLocale, slug: string) {
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
}
