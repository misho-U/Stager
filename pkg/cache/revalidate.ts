import 'server-only';

import { revalidatePath, revalidateTag } from 'next/cache';
import { after } from 'next/server';

import { REPURGE_AFTER_MS, type ContentEntity, tagsToRevalidate } from '@pkg/cache/tags';
import { logger } from '@pkg/logger';

/**
 * Invalidate the cached public reads affected by a write.
 *
 * Call this from a route handler AFTER the database write commits, never
 * before — revalidating first would let a concurrent request repopulate the
 * cache with the old row.
 *
 * Then, REPURGE_AFTER_MS later, every built page is dropped once more. Next
 * dates a built page by when it was stored, not when its render began, so a
 * render already under way when the save lands (a visitor's, or the admin's
 * own preview) read the old row, is stored after the purge and counts as
 * fresh: the save stayed off the site until the hourly refresh. The second
 * purge is by path, not by these tags, because Next drops a second
 * revalidateTag of a tag the same request already purged. The pages' cached
 * reads stay correct on their own (Next dates those by when they began), so
 * a dropped page re-renders from them. `cache-invalidation.spec.ts` lands a
 * save mid-render to check it.
 */
export function revalidateEntity(entity: ContentEntity, key?: string | null) {
  const tags = tagsToRevalidate(entity, key);

  for (const tag of tags) {
    // `{ expire: 0 }` means purge now, rather than serve-stale-while-revalidate.
    // That is the whole point here: an admin who publishes an edit and then
    // opens the site must see it, not a stale copy that refreshes a request
    // later. (Next 16 also warns if the second argument is omitted, and
    // `updateTag` — the Server Action equivalent — throws in route handlers.)
    revalidateTag(tag, { expire: 0 });
  }

  logger.debug('cache.revalidated', { entity, key, tags });

  after(async () => {
    await new Promise((resolve) => setTimeout(resolve, REPURGE_AFTER_MS));
    revalidatePath('/', 'layout');
  });
}
