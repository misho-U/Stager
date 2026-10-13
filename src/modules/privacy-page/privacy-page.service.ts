import type { DbLocale } from '@/shared/types/enums';
import { loadSiteChrome, readPage, readPublic } from '@/widgets/site-chrome/site-chrome.service';

/**
 * The privacy policy's reads, tagged like every public read
 * (widgets/site-chrome): the dashboard's next save shows here at once.
 *
 * A failed read is logged and said on the page, never covered with text that
 * reads like a policy. A missing page (a preview, sharing the live database,
 * before the migration that creates it is deployed) is not a failure: the
 * page then has no text yet, as on a fresh install.
 */
export async function loadPrivacyPageData(locale: DbLocale) {
  const [chrome, page] = await Promise.all([
    loadSiteChrome(locale),
    readPublic('page:PRIVACY', readPage('PRIVACY', locale), null),
  ]);

  return { chrome, page: page.data, readFailed: page.failed };
}
