/**
 * THE launch switch: whether search engines may index the public pages.
 *
 * True since the owner launched the site (October 2026), once every section
 * held real content and no sample was left to be indexed. Set it back to
 * false to take the whole site out of search at once. A preview or a local
 * server is never indexed whatever this says (`seo.service.ts`), and
 * robots.txt keeps crawlers off everything but the production deployment
 * (`app/robots.ts`).
 */
export const OPEN_TO_SEARCH = true;

/** The share card's locale per language (`og:locale`). */
export const OG_LOCALE = { KA: 'ka_GE', EN: 'en_US' } as const;

/** Past this, search results cut a description short. */
export const SEO_DESCRIPTION_MAX = 180;

/** Where STAGER works, as structured data names it (`areaServed`). */
export const AREA_SERVED = { KA: 'საქართველო', EN: 'Georgia' } as const;

/** The country of the address in Site settings (`addressCountry`, ISO 3166). */
export const ADDRESS_COUNTRY = 'GE';

/** Google shows no more of an article's headline than this. */
export const HEADLINE_MAX = 110;
