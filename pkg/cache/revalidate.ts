import 'server-only';

import { revalidateTag } from 'next/cache';

import { type ContentEntity, tagsToRevalidate } from '@pkg/cache/tags';
import { logger } from '@pkg/logger';

/**
 * Invalidate the cached public reads affected by a write.
 *
 * Call this from a route handler AFTER the database write commits, never
 * before — revalidating first would let a concurrent request repopulate the
 * cache with the old row.
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
}
