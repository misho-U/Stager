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

  // THE SECOND, FULL-SITE PURGE
  //
  // Why at all: Next dates a built page by when it was stored, not when its
  // render began. A render already under way when the save lands (a
  // visitor's, or the admin's own preview) has read the old row, is stored
  // after the purge above, and counts as fresh; a request arriving meanwhile
  // joins that render. Measured locally: a save 30 to 100 ms into a render
  // left the old content up until the hourly refresh. Dropping the pages
  // again once any such render has finished bounds that to REPURGE_AFTER_MS.
  //
  // Why the whole site, not these tags: Next ignores a second revalidateTag
  // of a tag this request already purged (it dedupes by tag and profile, and
  // only runs what is new after the after() callbacks). revalidatePath('/',
  // 'layout') purges a different tag that every page carries. It also
  // discards the cached reads behind each page, so the next visit to each
  // page re-reads the database once: about twenty pages, once per save,
  // which this site can afford.
  //
  // How it stays alive: after() runs once the response has been sent, under
  // the platform's waitUntil (Vercel's request context), so the admin never
  // waits for it and the function lives on for it. That time counts towards
  // the function's maxDuration. A save's handler takes well under a second
  // (a few queries, region fra1 beside the database), so with the wait it
  // ends around 6 s, inside the smallest default limit (10 s); the daily job
  // sets 60 s. Were a function stopped first, only this safety net is lost:
  // the purge above has already happened.
  after(async () => {
    await new Promise((resolve) => setTimeout(resolve, REPURGE_AFTER_MS));
    revalidatePath('/', 'layout');
  });
}
