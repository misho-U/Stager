/** The menu's links rising in as it opens. Nothing moves under reduced motion. */
export const SITE_MENU_MOTION = { duration: 0.6, ease: 'expo.out', stagger: 0.04 } as const;

/** A link to a section of the page the visitor is on, glided to rather than followed. */
export function isInPageLink(href: string): boolean {
  return href.startsWith('#');
}
