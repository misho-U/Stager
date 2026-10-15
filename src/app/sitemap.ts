import type { MetadataRoute } from 'next';

import { INSIGHTS_PATH, insightPath } from '@/entity/insight/model/insight.model';
import { PRIVACY_PATH } from '@/entity/page/model/page.model';
import { TEAM_PATH } from '@/entity/team-member/model/team-member.model';
import { toCanonicalUrl } from '@pkg/http/site-url';
import { DEFAULT_LOCALE, LOCALES, toDbLocale, type AppLocale } from '@pkg/i18n/routing';
import { listPublicInsights } from '@/server/published/insights';
import { loadSiteChrome } from '@/widgets/site-chrome/site-chrome.service';

/*
 * Built at build time like the pages, from the same cached, tagged reads, and
 * rebuilt when a save purges one of them.
 */

type Entry = { path: string; locales: readonly AppLocale[]; lastModified?: string };

/** Every published article, with the day it last changed. */
async function articles(): Promise<Entry[]> {
  const list = await listPublicInsights('EN', 100, 0);
  return list.items.map((item) => ({
    path: insightPath(item.slug),
    locales: LOCALES,
    lastModified: item.updatedAt ?? item.publishedAt ?? undefined,
  }));
}

/**
 * The pages beside home, each in the languages where it has something to
 * show: the same test the menu and footer use (`loadSiteChrome`), so an
 * empty list or a policy not yet written is never offered to a search
 * engine. The policy can be written in one language before the other.
 */
async function pages(): Promise<Entry[]> {
  const chromes = await Promise.all(
    LOCALES.map(async (locale) => ({ locale, chrome: await loadSiteChrome(toDbLocale(locale)) })),
  );
  const where = (has: (chrome: (typeof chromes)[number]['chrome']) => boolean) =>
    chromes.filter(({ chrome }) => has(chrome)).map(({ locale }) => locale);
  return [
    { path: TEAM_PATH, locales: where((chrome) => chrome.teamHref !== null) },
    { path: INSIGHTS_PATH, locales: where((chrome) => chrome.insightsHref !== null) },
    { path: PRIVACY_PATH, locales: where((chrome) => chrome.privacyHref !== null) },
  ];
}

/**
 * Every public page in each language it exists in, with its translations
 * named (hreflang), so a search engine shows a Georgian searcher the
 * Georgian page. A public page added later belongs in `pages()` too.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pageEntries, articleEntries] = await Promise.all([pages(), articles()]);
  const entries: Entry[] = [{ path: '', locales: LOCALES }, ...pageEntries, ...articleEntries];
  return entries.flatMap(({ path, locales, lastModified }) => {
    if (locales.length === 0) return [];
    const fallback = locales.includes(DEFAULT_LOCALE) ? DEFAULT_LOCALE : locales[0]!;
    const languages = {
      ...Object.fromEntries(locales.map((locale) => [locale, toCanonicalUrl(`/${locale}${path}`)])),
      'x-default': toCanonicalUrl(`/${fallback}${path}`),
    };
    return locales.map((locale) => ({
      url: toCanonicalUrl(`/${locale}${path}`),
      ...(lastModified ? { lastModified } : {}),
      alternates: { languages },
    }));
  });
}
