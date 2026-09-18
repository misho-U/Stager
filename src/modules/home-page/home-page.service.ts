import type { PublicPage } from '@/entity/page/model/page.model';
import type { PublicProjectListItem } from '@/entity/project/model/project.model';
import type { PublicLayoutData } from '@/entity/site-setting/model/site-setting.model';
import type { ListResponse } from '@/shared/types/api';
import type { DbLocale } from '@/shared/types/enums';
import { collectionTag, detailTag, LAYOUT_TAG, PUBLIC_REVALIDATE_SECONDS } from '@pkg/cache/tags';
import { serverFetch } from '@pkg/http/fetcher';

/**
 * Server-side data loading for the home page.
 *
 * Every read goes through /api with an explicit cache tag. That tag is the
 * other half of `revalidateEntity()` in the admin write path — together they
 * are what makes an edit in the dashboard appear here without a redeploy, while
 * ordinary visitors still get a cached response.
 *
 * Failures degrade rather than throw: a marketing homepage that renders without
 * its project list is far better than one that 500s.
 */
export async function loadHomePageData(locale: DbLocale) {
  const [layout, page, projects] = await Promise.all([
    serverFetch<PublicLayoutData>(`/api/public/layout?locale=${locale}`, {
      tags: [LAYOUT_TAG],
      revalidate: PUBLIC_REVALIDATE_SECONDS,
    }).catch(() => null),

    serverFetch<PublicPage>(`/api/public/pages/HOME?locale=${locale}`, {
      tags: [collectionTag('page'), detailTag('page', 'HOME')],
      revalidate: PUBLIC_REVALIDATE_SECONDS,
    }).catch(() => null),

    serverFetch<ListResponse<PublicProjectListItem>>(
      `/api/public/projects?locale=${locale}&limit=6`,
      {
        tags: [collectionTag('project')],
        revalidate: PUBLIC_REVALIDATE_SECONDS,
      },
    ).catch(() => ({ items: [], total: 0 })),
  ]);

  return { layout, page, projects };
}
