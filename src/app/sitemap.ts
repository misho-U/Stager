import type { MetadataRoute } from 'next';

import {
  INSIGHTS_PATH,
  insightPath,
  type PublicInsightListItem,
} from '@/entity/insight/model/insight.model';
import { PRIVACY_PATH } from '@/entity/page/model/page.model';
import { TEAM_PATH } from '@/entity/team-member/model/team-member.model';
import type { ListResponse } from '@/shared/types/api';
import { collectionTag, PUBLIC_REVALIDATE_SECONDS } from '@pkg/cache/tags';
import { serverFetch } from '@pkg/http/fetcher';
import { toCanonicalUrl } from '@pkg/http/site-url';
import { DEFAULT_LOCALE, LOCALES } from '@pkg/i18n/routing';
import { logger, serialiseError } from '@pkg/logger';

/**
 * Per request, like the pages: the published articles are read from the
 * API, which is not listening while `next build` runs.
 */
export const dynamic = 'force-dynamic';

/** The site's pages, by their path under a locale: '' is the home page. */
const PAGES = ['', TEAM_PATH, INSIGHTS_PATH, PRIVACY_PATH] as const;

/**
 * Every published article's slug. A failed read is logged and leaves the
 * articles out of this one response; the pages above are listed regardless.
 */
async function articleSlugs(): Promise<string[]> {
  try {
    const list = await serverFetch<ListResponse<PublicInsightListItem>>(
      `/api/public/insights?locale=EN&limit=100`,
      { tags: [collectionTag('insight')], revalidate: PUBLIC_REVALIDATE_SECONDS },
    );
    return list.items.map((item) => item.slug);
  } catch (error) {
    logger.error('public.read_failed', { read: 'sitemap:insights', ...serialiseError(error) });
    return [];
  }
}

/**
 * Every public page in each language, with its translations named (hreflang),
 * so a search engine shows a Georgian searcher the Georgian page. A public
 * page added later belongs in PAGES too.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = [...PAGES, ...(await articleSlugs()).map(insightPath)];
  return paths.flatMap((path) => {
    const languages = {
      ...Object.fromEntries(LOCALES.map((locale) => [locale, toCanonicalUrl(`/${locale}${path}`)])),
      'x-default': toCanonicalUrl(`/${DEFAULT_LOCALE}${path}`),
    };
    return LOCALES.map((locale) => ({
      url: toCanonicalUrl(`/${locale}${path}`),
      alternates: { languages },
    }));
  });
}
