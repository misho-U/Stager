import type { MetadataRoute } from 'next';

import { PRIVACY_PATH } from '@/entity/page/model/page.model';
import { toCanonicalUrl } from '@pkg/http/site-url';
import { DEFAULT_LOCALE, LOCALES } from '@pkg/i18n/routing';

/** The site's pages, by their path under a locale: '' is the home page. */
const PAGES = ['', PRIVACY_PATH] as const;

/**
 * Every public page in each language, with its translations named (hreflang),
 * so a search engine shows a Georgian searcher the Georgian page. A public
 * page added later belongs in PAGES too.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.flatMap((path) => {
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
