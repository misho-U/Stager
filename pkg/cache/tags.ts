/**
 * The cache-tag registry.
 *
 * Every public read is tagged here, and every admin write revalidates the same
 * tags. That pairing is the whole "edit in the dashboard, see it on the site"
 * mechanism, so tags are never written as inline string literals — put them in
 * this file or they will drift and content will silently go stale.
 */

export const CONTENT_ENTITIES = [
  'project',
  'service',
  'teamMember',
  'insight',
  'category',
  'page',
  'siteSetting',
  'socialLink',
  'media',
] as const;

export type ContentEntity = (typeof CONTENT_ENTITIES)[number];

/** Tag covering the whole collection for an entity. */
export function collectionTag(entity: ContentEntity): string {
  return `collection:${entity}`;
}

/** Tag covering a single record, keyed by slug or id. */
export function detailTag(entity: ContentEntity, key: string): string {
  return `detail:${entity}:${key}`;
}

/**
 * Tag for everything rendered in the shared layout (header, footer, nav).
 * Settings and social links feed the layout on every page, so a change to
 * either has to invalidate more than its own collection.
 */
export const LAYOUT_TAG = 'layout';

/**
 * Tags to invalidate when `entity` changes.
 *
 * Kept deliberately broad: over-invalidating costs one re-render, while
 * under-invalidating ships stale content to visitors and looks like a bug in
 * the dashboard.
 */
export function tagsToRevalidate(entity: ContentEntity, key?: string | null): string[] {
  const tags = [collectionTag(entity)];

  if (key) tags.push(detailTag(entity, key));

  // These three are rendered by the shared layout on every page.
  if (entity === 'siteSetting' || entity === 'socialLink' || entity === 'media') {
    tags.push(LAYOUT_TAG);
  }

  // A project card shows its service tags; a service page lists its projects.
  if (entity === 'service') tags.push(collectionTag('project'));
  if (entity === 'project') tags.push(collectionTag('service'));

  // Insights are listed by category and attributed to a team member.
  if (entity === 'category' || entity === 'teamMember') tags.push(collectionTag('insight'));

  return tags;
}

/** Default cache lifetime for public content, in seconds. */
export const PUBLIC_REVALIDATE_SECONDS = 3600;
