import { INSIGHTS_PATH } from '@/entity/insight/model/insight.model';
import { PRIVACY_PATH, privacyPolicy } from '@/entity/page/model/page.model';
import type { PublicLayoutData } from '@/entity/site-setting/model/site-setting.model';
import { TEAM_PATH } from '@/entity/team-member/model/team-member.model';
import type { DbLocale } from '@/shared/types/enums';
import { toAppLocale } from '@pkg/i18n/routing';
import { listPublicInsights } from '@/server/published/insights';
import { getPublicPage } from '@/server/published/pages';
import { getPublicLayoutData } from '@/server/published/site';
import { listPublicTeamMembers } from '@/server/published/team';

/**
 * What every public page reads for its header and footer. Server-side only:
 * called from a page module's service, never from a component.
 *
 * Every read goes through the published layer (src/server/published): cached,
 * tagged, and purged by the save that changes it, so the page is built once
 * and served as is until then. A read that fails is not caught here: during a
 * build the build fails, during a refresh the last good page stays up, and a
 * page rendered on request shows the site's error page. None of them shows
 * stand-in content.
 */

export type SiteChrome = {
  /** The site's settings. */
  layout: PublicLayoutData;
  /**
   * The pages beside the home page, each null while it would be empty: a
   * policy with no text, a team with no one published, no articles. Nothing
   * links to an empty page.
   */
  privacyHref: string | null;
  teamHref: string | null;
  insightsHref: string | null;
};

export async function loadSiteChrome(locale: DbLocale): Promise<SiteChrome> {
  const base = `/${toAppLocale(locale)}`;
  const [layout, privacy, team, insights] = await Promise.all([
    getPublicLayoutData(locale),
    getPublicPage('PRIVACY', locale),
    // One of each is enough: only whether there is any (`total`) is used.
    listPublicTeamMembers(locale, 1, 0),
    listPublicInsights(locale, 1, 0),
  ]);

  return {
    layout,
    privacyHref: privacyPolicy(privacy) ? `${base}${PRIVACY_PATH}` : null,
    teamHref: team.total > 0 ? `${base}${TEAM_PATH}` : null,
    insightsHref: insights.total > 0 ? `${base}${INSIGHTS_PATH}` : null,
  };
}
