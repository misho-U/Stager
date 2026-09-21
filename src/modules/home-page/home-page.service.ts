import type { PublicPage } from '@/entity/page/model/page.model';
import type { PublicProjectListItem } from '@/entity/project/model/project.model';
import type { PublicLayoutData } from '@/entity/site-setting/model/site-setting.model';
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

async function read<T>(label: string, request: Promise<T>, fallback: T): Promise<ReadResult<T>> {
  try {
    return { data: await request, failed: false };
  } catch (error) {
    logger.error('public.read_failed', { read: label, ...serialiseError(error) });
    return { data: fallback, failed: true };
  }
}

export async function loadHomePageData(locale: DbLocale) {
  const [layout, page, projects] = await Promise.all([
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

    read<ListResponse<PublicProjectListItem>>(
      'projects',
      serverFetch<ListResponse<PublicProjectListItem>>(
        `/api/public/projects?locale=${locale}&limit=6`,
        {
          tags: [collectionTag('project')],
          revalidate: PUBLIC_REVALIDATE_SECONDS,
        },
      ),
      { items: [], total: 0 },
    ),
  ]);

  return {
    layout: layout.data,
    page: page.data,
    projects: projects.data,
    /** True when any read failed, so the scaffold can say so instead of
     *  rendering placeholder copy that looks like real content. */
    readFailed: layout.failed || page.failed || projects.failed,
  };
}
