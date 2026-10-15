import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { cache } from 'react';

import { PRIVACY_PATH, privacyPolicy, type PublicPage } from '@/entity/page/model/page.model';
import type { DbLocale } from '@/shared/types/enums';
import { toAppLocale } from '@pkg/i18n/routing';
import { descriptionFor, pageMetadata, siteSeo, titleFor } from '@/widgets/seo/seo.service';
import { breadcrumbNode, structuredData, type JsonLdNode } from '@/widgets/seo/seo.utils';
import { getPublicPage } from '@/server/published/pages';
import { loadSiteChrome } from '@/widgets/site-chrome/site-chrome.service';

/**
 * The privacy policy's reads, through the published layer (cached and
 * tagged): the dashboard's next save rebuilds the page.
 *
 * A failed read is not caught (see widgets/site-chrome), never covered with
 * text that reads like a policy. A missing page (a preview, sharing the live
 * database, before the migration that creates it is deployed) is not a
 * failure: the page then has no text yet, as on a fresh install. Once per
 * render (React `cache`), for the page and its metadata alike.
 */
export const loadPrivacyPageData = cache(async (locale: DbLocale) => {
  const [chrome, page] = await Promise.all([
    loadSiteChrome(locale),
    getPublicPage('PRIVACY', locale),
  ]);

  return { chrome, page };
});

/** The policy's heading as the page shows it: the one written for it, else its name. */
export function privacyTitle(page: PublicPage | null, fallback: string): string {
  return privacyPolicy(page)?.heading || page?.title || fallback;
}

/** The page's search title and description; indexed once the policy has text. */
export async function loadPrivacyPageMetadata(locale: DbLocale): Promise<Metadata> {
  const [{ chrome, page }, t] = await Promise.all([
    loadPrivacyPageData(locale),
    getTranslations({ locale: toAppLocale(locale) }),
  ]);
  const site = siteSeo(chrome.layout);
  return pageMetadata({
    locale,
    path: PRIVACY_PATH,
    site,
    title: titleFor(page?.metaTitle, privacyTitle(page, t('privacy.title')), site),
    description: descriptionFor([page?.metaDescription], site),
    image: page?.ogImageUrl ? { url: page.ogImageUrl } : null,
    hasContent: privacyPolicy(page) !== null,
  });
}

/** The way here from the home page. */
export function privacyStructuredData(
  page: PublicPage | null,
  locale: DbLocale,
  names: { home: string; privacy: string },
): JsonLdNode {
  return structuredData([
    breadcrumbNode(locale, [
      { name: names.home, path: '' },
      { name: privacyTitle(page, names.privacy), path: PRIVACY_PATH },
    ]),
  ]);
}
