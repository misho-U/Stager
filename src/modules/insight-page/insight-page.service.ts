import type { Metadata } from 'next';
import { cache } from 'react';

import {
  INSIGHTS_PATH,
  insightPath,
  type PublicInsightDetail,
} from '@/entity/insight/model/insight.model';
import { SLUG_PATTERN } from '@/shared/types/api';
import type { DbLocale } from '@/shared/types/enums';
import { getPublicInsight, listPublicInsights } from '@/server/published/insights';
import { descriptionFor, pageMetadata, siteSeo, titleFor } from '@/widgets/seo/seo.service';
import {
  articleNode,
  breadcrumbNode,
  structuredData,
  type JsonLdNode,
} from '@/widgets/seo/seo.utils';
import { loadSiteChrome } from '@/widgets/site-chrome/site-chrome.service';

/** How many other articles an article suggests at its end. */
const MORE_COUNT = 3;

/** How many articles are built ahead of time: every one the API lists. */
const BUILT_ARTICLES = 100;

/**
 * Built with the address of no article when there are none: Cache Components
 * needs at least one param for a page to be built, and this one can never be
 * a published slug (SLUG_PATTERN refuses it), so it is built as a 404.
 */
export const NO_ARTICLE_SLUG = '-';

/** The articles built ahead of time: every published one, or the placeholder. */
export async function builtInsightSlugs(): Promise<string[]> {
  const { items } = await listPublicInsights('EN', BUILT_ARTICLES, 0);
  return items.length > 0 ? items.map((item) => item.slug) : [NO_ARTICLE_SLUG];
}

/**
 * One published article, or null where there is none by that address (a
 * draft, a deleted one, a mistyped link): the page is then a 404. Tagged with
 * the article's slug, the key every save of it revalidates
 * (app/api/admin/insights). An address that cannot be a slug never reaches
 * the database.
 */
export function readInsight(locale: DbLocale, slug: string): Promise<PublicInsightDetail | null> {
  if (!SLUG_PATTERN.test(slug)) return Promise.resolve(null);
  return getPublicInsight(slug, locale);
}

/**
 * The article and three more to read, through the published layer (cached
 * and tagged; a failed read is not caught, see widgets/site-chrome). Once per
 * render (React `cache`), for the page and its metadata alike.
 */
export const loadInsightPageData = cache(async (locale: DbLocale, slug: string) => {
  const [chrome, article, latest] = await Promise.all([
    loadSiteChrome(locale),
    readInsight(locale, slug),
    listPublicInsights(locale, MORE_COUNT + 1, 0),
  ]);

  return {
    chrome,
    article,
    more: latest.items.filter((item) => item.slug !== slug).slice(0, MORE_COUNT),
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
