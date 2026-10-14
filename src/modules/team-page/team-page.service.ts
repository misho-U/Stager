import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { cache } from 'react';

import { pageIntro, pageName } from '@/entity/page/model/page.model';
import { TEAM_PATH, type PublicTeamMember } from '@/entity/team-member/model/team-member.model';
import type { ListResponse } from '@/shared/types/api';
import type { DbLocale } from '@/shared/types/enums';
import { collectionTag, PUBLIC_REVALIDATE_SECONDS } from '@pkg/cache/tags';
import { serverFetch } from '@pkg/http/fetcher';
import { toAppLocale } from '@pkg/i18n/routing';
import { descriptionFor, pageMetadata, siteSeo, titleFor } from '@/widgets/seo/seo.service';
import {
  breadcrumbNode,
  personNode,
  structuredData,
  type JsonLdNode,
} from '@/widgets/seo/seo.utils';
import { loadSiteChrome, readPage, readPublic } from '@/widgets/site-chrome/site-chrome.service';

/**
 * The team page's reads: its heading and line (Page copy → Team) and every
 * published member (dashboard → Team), in the dashboard's order. Tagged like
 * every public read (widgets/site-chrome). A failed read shows no one, and
 * the page says it failed; never placeholder people. Once per request
 * (React `cache`), for the page and its metadata alike.
 */
export const loadTeamPageData = cache(async (locale: DbLocale) => {
  const [chrome, page, members] = await Promise.all([
    loadSiteChrome(locale),
    readPublic('page:TEAM', readPage('TEAM', locale), null),
    readPublic<ListResponse<PublicTeamMember>>(
      'team',
      serverFetch<ListResponse<PublicTeamMember>>(`/api/public/team?locale=${locale}&limit=100`, {
        tags: [collectionTag('teamMember')],
        revalidate: PUBLIC_REVALIDATE_SECONDS,
      }),
      { items: [], total: 0 },
    ),
  ]);

  return {
    chrome,
    page: page.data,
    members: members.data.items,
    readFailed: page.failed || members.failed,
  };
});

/** The page's search title, description and share card; indexed once someone is published. */
export async function loadTeamPageMetadata(locale: DbLocale): Promise<Metadata> {
  const [{ chrome, page, members }, t] = await Promise.all([
    loadTeamPageData(locale),
    getTranslations({ locale: toAppLocale(locale) }),
  ]);
  const site = siteSeo(chrome.layout);
  return pageMetadata({
    locale,
    path: TEAM_PATH,
    site,
    title: titleFor(page?.metaTitle, pageName(page, t('nav.team')), site),
    description: descriptionFor([page?.metaDescription, pageIntro(page).lead], site),
    image: page?.ogImageUrl ? { url: page.ogImageUrl } : null,
    hasContent: members.length > 0,
  });
}

/** Each published member, as someone who works for STAGER, and the way here from home. */
export function teamStructuredData(
  { chrome, page, members }: Awaited<ReturnType<typeof loadTeamPageData>>,
  locale: DbLocale,
  names: { home: string; team: string },
): JsonLdNode {
  const site = siteSeo(chrome.layout);
  return structuredData([
    breadcrumbNode(locale, [
      { name: names.home, path: '' },
      { name: pageName(page, names.team), path: TEAM_PATH },
    ]),
    ...members.map((member) => personNode({ member, locale, site, layout: chrome.layout })),
  ]);
}

/**
 * "Lika Gulua" is LG: the mark of a member whose photo is not in yet. Taken
 * as written, never upper-cased: that would turn Georgian letters into
 * Unicode Mtavruli capitals, which the site's typeface does not hold.
 */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('');
}
