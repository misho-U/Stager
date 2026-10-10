import type { PublicCourse } from '@/entity/course/model/course.model';
import type { PublicInsightListItem } from '@/entity/insight/model/insight.model';
import {
  orSamples,
  sampleCourses,
  sampleStats,
  sampleVideos,
} from '@/modules/home-page/home-page.samples';
import type { PublicPage } from '@/entity/page/model/page.model';
import type { PublicProjectListItem } from '@/entity/project/model/project.model';
import type { PublicServiceListItem } from '@/entity/service/model/service.model';
import type { PublicStat } from '@/entity/stat/model/stat.model';
import type { PublicLayoutData } from '@/entity/site-setting/model/site-setting.model';
import type { PublicVideo } from '@/entity/video/model/video.model';
import type { ListResponse } from '@/shared/types/api';
import type { DbLocale } from '@/shared/types/enums';
import { collectionTag, detailTag, LAYOUT_TAG, PUBLIC_REVALIDATE_SECONDS } from '@pkg/cache/tags';
import { serverFetch } from '@pkg/http/fetcher';
import { logger, serialiseError } from '@pkg/logger';

/**
 * Server-side data loading for the home page.
 *
 * Every read goes through /api with an explicit cache tag. That tag is the
 * other half of `revalidateEntity()` in the admin write path — together they
 * are what makes an edit in the dashboard appear here without a redeploy, while
 * ordinary visitors still get a cached response.
 *
 * Failures degrade rather than throw: a marketing homepage that renders without
 * its project list is far better than one that 500s. They are LOGGED, though —
 * an earlier version caught and discarded the error, so a completely dead API
 * looked exactly like a working page and stayed hidden for days. Degrading
 * quietly for the visitor is right; degrading quietly for the operator is not.
 */

type ReadResult<T> = { data: T; failed: boolean };

/**
 * A project list as it may come out of the data cache: one cached before
 * projects carried their gallery (the cache can outlive a deployment) has
 * none, until it is next refreshed.
 */
type CachedProjectList = ListResponse<
  Omit<PublicProjectListItem, 'gallery'> & Partial<Pick<PublicProjectListItem, 'gallery'>>
>;

function withGalleries(list: CachedProjectList): ListResponse<PublicProjectListItem> {
  return {
    ...list,
    items: list.items.map((project) => ({ ...project, gallery: project.gallery ?? [] })),
  };
}

async function read<T>(label: string, request: Promise<T>, fallback: T): Promise<ReadResult<T>> {
  try {
    return { data: await request, failed: false };
  } catch (error) {
    logger.error('public.read_failed', { read: label, ...serialiseError(error) });
    return { data: fallback, failed: true };
  }
}

export async function loadHomePageData(locale: DbLocale) {
  const [layout, page, stats, projects, services, insights, courses, videos] = await Promise.all([
    read<PublicLayoutData | null>(
      'layout',
      serverFetch<PublicLayoutData>(`/api/public/layout?locale=${locale}`, {
        tags: [LAYOUT_TAG],
        revalidate: PUBLIC_REVALIDATE_SECONDS,
      }),
      null,
    ),

    read<PublicPage | null>(
      'page:HOME',
      serverFetch<PublicPage>(`/api/public/pages/HOME?locale=${locale}`, {
        tags: [collectionTag('page'), detailTag('page', 'HOME')],
        revalidate: PUBLIC_REVALIDATE_SECONDS,
      }),
      null,
    ),

    read<ListResponse<PublicStat>>(
      'stats',
      serverFetch<ListResponse<PublicStat>>(`/api/public/company-stats?locale=${locale}`, {
        tags: [collectionTag('stat')],
        revalidate: PUBLIC_REVALIDATE_SECONDS,
      }),
      { items: [], total: 0 },
    ),

    read<CachedProjectList>(
      'projects',
      serverFetch<CachedProjectList>(`/api/public/projects?locale=${locale}&limit=6`, {
        tags: [collectionTag('project')],
        revalidate: PUBLIC_REVALIDATE_SECONDS,
      }),
      { items: [], total: 0 },
    ),

    // Every published service, up to the API's maximum: they are the whole
    // offering, not a selection (projects and videos show the latest few).
    // At 12, a thirteenth service added in the dashboard never appeared here.
    read<ListResponse<PublicServiceListItem>>(
      'services',
      serverFetch<ListResponse<PublicServiceListItem>>(
        `/api/public/services?locale=${locale}&limit=100`,
        {
          tags: [collectionTag('service')],
          revalidate: PUBLIC_REVALIDATE_SECONDS,
        },
      ),
      { items: [], total: 0 },
    ),

    read<ListResponse<PublicInsightListItem>>(
      'insights',
      serverFetch<ListResponse<PublicInsightListItem>>(
        `/api/public/insights?locale=${locale}&limit=3`,
        {
          tags: [collectionTag('insight')],
          revalidate: PUBLIC_REVALIDATE_SECONDS,
        },
      ),
      { items: [], total: 0 },
    ),

    // A course leaves this list once its start date has passed. The API
    // decides that per request, so a cached copy can show one for up to
    // PUBLIC_REVALIDATE_SECONDS after Tbilisi midnight.
    read<ListResponse<PublicCourse>>(
      'courses',
      serverFetch<ListResponse<PublicCourse>>(`/api/public/courses?locale=${locale}`, {
        tags: [collectionTag('course')],
        revalidate: PUBLIC_REVALIDATE_SECONDS,
      }),
      { items: [], total: 0 },
    ),

    read<ListResponse<PublicVideo>>(
      'videos',
      serverFetch<ListResponse<PublicVideo>>(`/api/public/videos?locale=${locale}&limit=6`, {
        tags: [collectionTag('video')],
        revalidate: PUBLIC_REVALIDATE_SECONDS,
      }),
      { items: [], total: 0 },
    ),
  ]);

  return {
    layout: layout.data,
    page: page.data,
    stats: orSamples(stats, () => sampleStats(locale)),
    projects: withGalleries(projects.data),
    services: services.data,
    insights: insights.data,
    courses: orSamples(courses, () => sampleCourses(locale)),
    videos: orSamples(videos, () => sampleVideos(locale)),
    /** True when any read failed, so the page can say so instead of
     *  rendering placeholder copy that looks like real content. */
    readFailed:
      layout.failed ||
      page.failed ||
      stats.failed ||
      projects.failed ||
      services.failed ||
      insights.failed ||
      courses.failed ||
      videos.failed,
  };
}

export type HomePageData = Awaited<ReturnType<typeof loadHomePageData>>;
