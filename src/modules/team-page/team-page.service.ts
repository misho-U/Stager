import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { cache } from 'react';

import { pageIntro, pageName } from '@/entity/page/model/page.model';
import { TEAM_PATH } from '@/entity/team-member/model/team-member.model';
import type { DbLocale } from '@/shared/types/enums';
import { toAppLocale } from '@pkg/i18n/routing';
import { getPublicPage } from '@/server/published/pages';
import { listPublicTeamMembers } from '@/server/published/team';
import { descriptionFor, pageMetadata, siteSeo, titleFor } from '@/widgets/seo/seo.service';
import {
  breadcrumbNode,
  personNode,
  structuredData,
  type JsonLdNode,
} from '@/widgets/seo/seo.utils';
import { loadSiteChrome } from '@/widgets/site-chrome/site-chrome.service';

/**
 * The team page's reads: its heading and line (Page copy → Team) and every
 * published member (dashboard → Team), in the dashboard's order, through the
 * published layer (cached and tagged; a failed read is not caught, see
 * widgets/site-chrome). Never placeholder people. Once per render (React
 * `cache`), for the page and its metadata alike.
 */
export const loadTeamPageData = cache(async (locale: DbLocale) => {
  const [chrome, page, members] = await Promise.all([
    loadSiteChrome(locale),
    getPublicPage('TEAM', locale),
    listPublicTeamMembers(locale, 100, 0),
  ]);

  return { chrome, page, members: members.items };
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
