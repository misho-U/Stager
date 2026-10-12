import { INSIGHTS_PATH, type PublicInsightListItem } from '@/entity/insight/model/insight.model';
import { PRIVACY_PATH, privacyPolicy, type PublicPage } from '@/entity/page/model/page.model';
import type { PublicLayoutData } from '@/entity/site-setting/model/site-setting.model';
import { TEAM_PATH, type PublicTeamMember } from '@/entity/team-member/model/team-member.model';
import type { ListResponse } from '@/shared/types/api';
import type { DbLocale, PageKey } from '@/shared/types/enums';
import { collectionTag, detailTag, LAYOUT_TAG, PUBLIC_REVALIDATE_SECONDS } from '@pkg/cache/tags';
import { ApiError } from '@pkg/http/api-error';
import { serverFetch } from '@pkg/http/fetcher';
import { toAppLocale } from '@pkg/i18n/routing';
import { logger, serialiseError } from '@pkg/logger';

/**
 * What every public page reads for its header and footer, and the read
 * helpers the page modules share. Server-side only: called from a page
 * module's service, never from a component.
 *
 * Every read is tagged (pkg/cache/tags.ts), so a save in the dashboard shows
 * on the next request. A failed read is logged as `public.read_failed` and
 * reported, for the page to say so; it never stands in content of its own.
 */

export type ReadResult<T> = { data: T; failed: boolean };

/** A public read that degrades instead of throwing, and is logged when it does. */
export async function readPublic<T>(
  label: string,
  request: Promise<T>,
  fallback: T,
): Promise<ReadResult<T>> {
  try {
    return { data: await request, failed: false };
  } catch (error) {
    logger.error('public.read_failed', { read: label, ...serialiseError(error) });
    return { data: fallback, failed: true };
  }
}

/**
 * A page's copy, or null where the database has no such page: a preview,
 * sharing the live database, can run before the migration that creates one.
 * Missing is not a failed read; anything else is.
 */
export function readPage(key: PageKey, locale: DbLocale): Promise<PublicPage | null> {
  return serverFetch<PublicPage>(`/api/public/pages/${key}?locale=${locale}`, {
    tags: [collectionTag('page'), detailTag('page', key)],
    revalidate: PUBLIC_REVALIDATE_SECONDS,
  }).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  });
}

export type SiteChrome = {
  /** The site's settings; null when they could not be read. */
  layout: PublicLayoutData | null;
  /**
   * The pages beside the home page, each null while it would be empty: a
   * policy with no text, a team with no one published, no articles. Nothing
   * links to an empty page.
   */
  privacyHref: string | null;
  teamHref: string | null;
  insightsHref: string | null;
  failed: boolean;
};

export async function loadSiteChrome(locale: DbLocale): Promise<SiteChrome> {
  const base = `/${toAppLocale(locale)}`;
  const none = { items: [], total: 0 };
  const [layout, privacy, team, insights] = await Promise.all([
    readPublic<PublicLayoutData | null>(
      'layout',
      serverFetch<PublicLayoutData>(`/api/public/layout?locale=${locale}`, {
        tags: [LAYOUT_TAG],
        revalidate: PUBLIC_REVALIDATE_SECONDS,
      }),
      null,
    ),
    readPublic<PublicPage | null>('page:PRIVACY', readPage('PRIVACY', locale), null),
    // One of each is enough: only whether there is any (`total`) is used.
    readPublic<ListResponse<PublicTeamMember>>(
      'team:any',
      serverFetch<ListResponse<PublicTeamMember>>(`/api/public/team?locale=${locale}&limit=1`, {
        tags: [collectionTag('teamMember')],
        revalidate: PUBLIC_REVALIDATE_SECONDS,
      }),
      none,
    ),
    readPublic<ListResponse<PublicInsightListItem>>(
      'insights:any',
      serverFetch<ListResponse<PublicInsightListItem>>(
        `/api/public/insights?locale=${locale}&limit=1`,
        { tags: [collectionTag('insight')], revalidate: PUBLIC_REVALIDATE_SECONDS },
      ),
      none,
    ),
  ]);

  return {
    layout: layout.data,
    privacyHref: privacyPolicy(privacy.data) ? `${base}${PRIVACY_PATH}` : null,
    teamHref: team.data.total > 0 ? `${base}${TEAM_PATH}` : null,
    insightsHref: insights.data.total > 0 ? `${base}${INSIGHTS_PATH}` : null,
    failed: layout.failed || privacy.failed || team.failed || insights.failed,
  };
}
