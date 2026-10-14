import type { Metadata } from 'next';

import type { PublicLayoutData } from '@/entity/site-setting/model/site-setting.model';
import shareImage from '@/shared/brandbook/images/share-image.png';
import { BRAND } from '@/shared/brandbook/tokens';
import { shortText } from '@/shared/lib/content';
import type { DbLocale } from '@/shared/types/enums';
import { serverEnv } from '@pkg/config/env.server';
import { toCanonicalUrl } from '@pkg/http/site-url';
import { DEFAULT_LOCALE, LOCALES, toAppLocale } from '@pkg/i18n/routing';
import { OG_LOCALE, OPEN_TO_SEARCH, SEO_DESCRIPTION_MAX } from '@/widgets/seo/seo.constants';

/**
 * What a public page tells search engines, AI crawlers and share previews:
 * its title and description in the page's language (written in the
 * dashboard: Page copy, Site settings, an article's own fields), its one
 * address and its translations, the share card, and whether it may be
 * indexed. Every public page builds its metadata here, so no page can drift.
 */

export type SeoImage = { url: string; width?: number | null; height?: number | null; alt?: string };

/** The site's own name, title and description: Site settings, then the brand's. */
export type SiteSeo = { name: string; title: string; description: string };

export function siteSeo(layout: PublicLayoutData | null): SiteSeo {
  const name = layout?.siteName.trim() || BRAND.name;
  return {
    name,
    title: layout?.metaTitle?.trim() || `${name} — ${BRAND.positioning}`,
    description: layout?.metaDescription?.trim() || layout?.tagline.trim() || BRAND.tagline,
  };
}

/** A page's title as results show it: its own search title, else "Team — STAGER". */
export function titleFor(own: string | null | undefined, name: string, site: SiteSeo): string {
  return own?.trim() || `${name} — ${site.name}`;
}

/** The first description written for the page, else the site's. Plain text, cut to fit. */
export function descriptionFor(
  candidates: ReadonlyArray<string | null | undefined>,
  site: SiteSeo,
): string {
  const own = candidates.find((text) => text?.trim());
  return shortText(own ?? site.description, SEO_DESCRIPTION_MAX);
}

/** The share card every page without an image of its own uses (`brand-images.ts` draws it). */
export const DEFAULT_SHARE_IMAGE: SeoImage = {
  url: shareImage.src,
  width: shareImage.width,
  height: shareImage.height,
};

/** A page's one address: the configured domain, never the deployment's. */
export function canonicalUrl(locale: DbLocale, path: string): string {
  return toCanonicalUrl(`/${toAppLocale(locale)}${path}`);
}

/**
 * Indexed only once launched (`OPEN_TO_SEARCH`), only on the production
 * deployment, and only when the page has something to show: a list with no
 * entries or a policy not yet written stays out, its links still followed.
 */
function robotsFor(hasContent: boolean): Metadata['robots'] {
  if (!OPEN_TO_SEARCH || serverEnv.VERCEL_ENV !== 'production') {
    return { index: false, follow: false };
  }
  return { index: hasContent, follow: true };
}

export type PageSeo = {
  locale: DbLocale;
  /** The page's path under its locale: '' for the home page, '/team', '/insights/<slug>'. */
  path: string;
  /** The title in full, as results show it (`titleFor`). */
  title: string;
  description: string;
  site: SiteSeo;
  /** The page's own share image; the site's when it has none. */
  image?: SeoImage | null;
  /** False for an empty list or an unwritten policy: never offered to search engines. */
  hasContent: boolean;
  /** For an article: when it came out and last changed, and its section. */
  article?: {
    publishedTime: string | null;
    modifiedTime?: string;
    section: string | null;
  } | null;
};

export function pageMetadata(seo: PageSeo): Metadata {
  const url = canonicalUrl(seo.locale, seo.path);
  const image = seo.image ?? DEFAULT_SHARE_IMAGE;
  const images = [
    {
      url: image.url,
      width: image.width ?? undefined,
      height: image.height ?? undefined,
      alt: image.alt || seo.site.name,
    },
  ];
  const otherLocales = (['KA', 'EN'] as const).filter((locale) => locale !== seo.locale);

  return {
    title: { absolute: seo.title },
    description: seo.description,
    alternates: {
      canonical: url,
      languages: {
        ...Object.fromEntries(
          LOCALES.map((locale) => [locale, toCanonicalUrl(`/${locale}${seo.path}`)]),
        ),
        'x-default': toCanonicalUrl(`/${DEFAULT_LOCALE}${seo.path}`),
      },
    },
    openGraph: {
      ...(seo.article
        ? {
            type: 'article',
            publishedTime: seo.article.publishedTime ?? undefined,
            modifiedTime: seo.article.modifiedTime,
            section: seo.article.section ?? undefined,
          }
        : { type: 'website' }),
      url,
      siteName: seo.site.name,
      title: seo.title,
      description: seo.description,
      locale: OG_LOCALE[seo.locale],
      alternateLocale: otherLocales.map((locale) => OG_LOCALE[locale]),
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
      images,
    },
    robots: robotsFor(seo.hasContent),
  };
}
