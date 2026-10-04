import type { MetadataRoute } from 'next';

import { toCanonicalUrl } from '@pkg/http/site-url';
import { DEFAULT_LOCALE, LOCALES } from '@pkg/i18n/routing';

/**
 * Every public page in each language, with its translations named (hreflang),
 * so a search engine shows a Georgian searcher the Georgian page. Only the
 * home page is public so far; a public page added later belongs here too.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const languages = {
    ...Object.fromEntries(LOCALES.map((locale) => [locale, toCanonicalUrl(`/${locale}`)])),
    'x-default': toCanonicalUrl(`/${DEFAULT_LOCALE}`),
  };

  return LOCALES.map((locale) => ({
    url: toCanonicalUrl(`/${locale}`),
    alternates: { languages },
  }));
}
