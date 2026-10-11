import type { PublicPage } from '@/entity/page/model/page.model';
import type { PublicLayoutData } from '@/entity/site-setting/model/site-setting.model';
import type { DbLocale } from '@/shared/types/enums';
import { collectionTag, detailTag, LAYOUT_TAG, PUBLIC_REVALIDATE_SECONDS } from '@pkg/cache/tags';
import { ApiError } from '@pkg/http/api-error';
import { serverFetch } from '@pkg/http/fetcher';
import { logger, serialiseError } from '@pkg/logger';

/**
 * The privacy policy's reads, tagged like every public read (see
 * home-page.service.ts): the dashboard's next save shows here at once.
 *
 * A failed read is logged and said on the page, never covered with text that
 * reads like a policy. A missing page (a preview, sharing the live database,
 * before the migration that creates it is deployed) is not a failure: the
 * page then has no text yet, as on a fresh install.
 */
async function read<T>(label: string, request: Promise<T>, fallback: T) {
  try {
    return { data: await request, failed: false };
  } catch (error) {
    logger.error('public.read_failed', { read: label, ...serialiseError(error) });
    return { data: fallback, failed: true };
  }
}

export async function loadPrivacyPageData(locale: DbLocale) {
  const [layout, page] = await Promise.all([
    read<PublicLayoutData | null>(
      'layout',
      serverFetch<PublicLayoutData>(`/api/public/layout?locale=${locale}`, {
        tags: [LAYOUT_TAG],
        revalidate: PUBLIC_REVALIDATE_SECONDS,
      }),
      null,
    ),
    read<PublicPage | null>(
      'page:PRIVACY',
      serverFetch<PublicPage>(`/api/public/pages/PRIVACY?locale=${locale}`, {
        tags: [collectionTag('page'), detailTag('page', 'PRIVACY')],
        revalidate: PUBLIC_REVALIDATE_SECONDS,
      }).catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }),
      null,
    ),
  ]);

  return {
    layout: layout.data,
    page: page.data,
    readFailed: layout.failed || page.failed,
  };
}
