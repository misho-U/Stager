import type { Metadata } from 'next';
import { cache } from 'react';

import {
  orSamples,
  sampleCourses,
  sampleStats,
  sampleVideos,
} from '@/modules/home-page/home-page.samples';
import type { DbLocale } from '@/shared/types/enums';
import { listPublicCourses } from '@/server/published/courses';
import { listPublicInsights } from '@/server/published/insights';
import { getPublicPage } from '@/server/published/pages';
import { listPublicProjects } from '@/server/published/projects';
import { listPublicServices } from '@/server/published/services';
import { listPublicStats } from '@/server/published/stats';
import { listPublicVideos } from '@/server/published/videos';
import { descriptionFor, pageMetadata, siteSeo } from '@/widgets/seo/seo.service';
import {
  organizationNode,
  structuredData,
  websiteNode,
  type JsonLdNode,
} from '@/widgets/seo/seo.utils';
import { loadSiteChrome } from '@/widgets/site-chrome/site-chrome.service';

/**
 * Server-side data loading for the home page.
 *
 * Every read goes through the published layer (src/server/published): cached
 * and tagged, so the page is built once, at build time, and rebuilt when a
 * save in the dashboard purges a tag it used (`revalidateEntity()` in the
 * admin write path). Visitors are served the built page.
 *
 * A failed read is not caught: during a build the build fails, during a
 * refresh the last good page stays up, and either way it is logged. An
 * earlier version caught and discarded errors, so a dead API looked exactly
 * like a working page and stayed hidden for days; a built page must never
 * hold a failure, or it would be served to every visitor until the next save.
 */

/** How many of each the page shows: the latest few, or every service. */
const PROJECTS_SHOWN = 6;
// The latest article only; the rest are on the articles page.
const INSIGHTS_SHOWN = 1;
const VIDEOS_SHOWN = 6;
const COURSES_SHOWN = 50;
// Every published service, up to the API's maximum: they are the whole
// offering, not a selection. At 12, a thirteenth service added in the
// dashboard never appeared here.
const SERVICES_SHOWN = 100;

/**
 * Once per render (React `cache`): the page and its metadata read the same
 * data. A course leaves its list once its start date has passed: the daily job
 * purges the list just after Tbilisi midnight (COURSE_CACHE_LIFE).
 */
export const loadHomePageData = cache(async (locale: DbLocale) => {
  const [chrome, page, stats, projects, services, insights, courses, videos] = await Promise.all([
    // The site's settings, and which pages beside this one have anything
    // to show (the menu and footer link only to those).
    loadSiteChrome(locale),
    getPublicPage('HOME', locale),
    listPublicStats(locale),
    listPublicProjects(locale, PROJECTS_SHOWN, 0),
    listPublicServices(locale, SERVICES_SHOWN, 0),
    listPublicInsights(locale, INSIGHTS_SHOWN, 0),
    listPublicCourses(locale, COURSES_SHOWN, 0),
    listPublicVideos(locale, VIDEOS_SHOWN, 0),
  ]);

  return {
    chrome,
    page,
    stats: await orSamples(stats.items, () => sampleStats(locale)),
    projects,
    services,
    insights,
    courses: await orSamples(courses.items, () => sampleCourses(locale)),
    videos: await orSamples(videos.items, () => sampleVideos(locale)),
  };
});

export type HomePageData = Awaited<ReturnType<typeof loadHomePageData>>;

/**
 * The home page's title, description and share card: its own search fields
 * (Page copy → Home), else the site's (Site settings).
 */
export async function loadHomePageMetadata(locale: DbLocale): Promise<Metadata> {
  const { chrome, page } = await loadHomePageData(locale);
  const site = siteSeo(chrome.layout);
  return pageMetadata({
    locale,
    path: '',
    site,
    title: page?.metaTitle?.trim() || site.title,
    description: descriptionFor([page?.metaDescription], site),
    image: page?.ogImageUrl ? { url: page.ogImageUrl } : null,
    hasContent: true,
  });
}

/**
 * Who the company is, what it offers and the site itself, for search
 * engines and AI answers. Real services only: the samples the page shows
 * for empty sections never reach it.
 */
export function homeStructuredData(
  { chrome, services }: HomePageData,
  locale: DbLocale,
  servicesName: string,
): JsonLdNode {
  const site = siteSeo(chrome.layout);
  return structuredData([
    organizationNode({
      site,
      layout: chrome.layout,
      locale,
      services: services.items,
      servicesName,
    }),
    websiteNode(site, locale),
  ]);
}
