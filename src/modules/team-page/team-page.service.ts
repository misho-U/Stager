import type { PublicTeamMember } from '@/entity/team-member/model/team-member.model';
import type { ListResponse } from '@/shared/types/api';
import type { DbLocale } from '@/shared/types/enums';
import { collectionTag, PUBLIC_REVALIDATE_SECONDS } from '@pkg/cache/tags';
import { serverFetch } from '@pkg/http/fetcher';
import { loadSiteChrome, readPage, readPublic } from '@/widgets/site-chrome/site-chrome.service';

/**
 * The team page's reads: its heading and line (Page copy → Team) and every
 * published member (dashboard → Team), in the dashboard's order. Tagged like
 * every public read (widgets/site-chrome). A failed read shows no one, and
 * the page says it failed; never placeholder people.
 */
export async function loadTeamPageData(locale: DbLocale) {
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
