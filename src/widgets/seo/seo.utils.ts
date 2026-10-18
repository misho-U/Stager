import type { PublicCourse } from '@/entity/course/model/course.model';
import type { PublicInsightDetail } from '@/entity/insight/model/insight.model';
import type { MediaSummary } from '@/entity/media/model/media.model';
import type { PublicServiceListItem } from '@/entity/service/model/service.model';
import type { PublicLayoutData } from '@/entity/site-setting/model/site-setting.model';
import { TEAM_PATH, type PublicTeamMember } from '@/entity/team-member/model/team-member.model';
import type { PublicVideo } from '@/entity/video/model/video.model';
import { shortText } from '@/shared/lib/content';
import { youtubeId, youtubeThumbnail } from '@/shared/lib/youtube';
import type { DbLocale } from '@/shared/types/enums';
import { toCanonicalUrl } from '@pkg/http/site-url';
import { toAppLocale } from '@pkg/i18n/routing';
import {
  ADDRESS_COUNTRY,
  AREA_SERVED,
  HEADLINE_MAX,
  SEO_DESCRIPTION_MAX,
} from '@/widgets/seo/seo.constants';
import { canonicalUrl, DEFAULT_SHARE_IMAGE, type SiteSeo } from '@/widgets/seo/seo.service';

/**
 * Structured data (schema.org, as JSON-LD): who STAGER is, what it offers,
 * who works there and what each article is, in the form search engines and
 * AI answers read to describe a business. Built only from what the
 * dashboard holds: never a sample entry, and a field left blank is left out
 * rather than guessed. One graph per page (`structuredData`), rendered by
 * `<JsonLd>` (seo.module.tsx).
 */

export type JsonLdNode = Record<string, unknown>;

/** Blank reads as absent, so the field is left out of the output. */
function text(value: string | null | undefined): string | undefined {
  return value?.trim() || undefined;
}

function list<T>(values: ReadonlyArray<T | null | undefined>): T[] | undefined {
  const present = values.filter((value): value is T => value !== null && value !== undefined);
  return present.length > 0 ? present : undefined;
}

function imageObject(media: MediaSummary | null | undefined): JsonLdNode | undefined {
  if (!media) return undefined;
  return {
    '@type': 'ImageObject',
    url: media.url,
    width: media.width ?? undefined,
    height: media.height ?? undefined,
  };
}

/** One identity for the company on every page, so the nodes join up. */
function organizationId(): string {
  return toCanonicalUrl('/#organization');
}

/** The company as the author, publisher or employer of something. */
function organizationRef(site: SiteSeo, layout: PublicLayoutData | null): JsonLdNode {
  return {
    '@type': 'Organization',
    '@id': organizationId(),
    name: site.name,
    url: toCanonicalUrl('/'),
    logo: imageObject(layout?.logo),
  };
}

/** A page's graph: the nodes it describes, the empty ones dropped. */
export function structuredData(nodes: ReadonlyArray<JsonLdNode | null | undefined>): JsonLdNode {
  return { '@context': 'https://schema.org', '@graph': list(nodes) ?? [] };
}

/**
 * The company: name, logo, contact, profiles and services. A local business
 * (`ProfessionalService`) once Site settings hold its address; an
 * organization until then, since a business without an address is not one
 * search engines can place.
 */
export function organizationNode({
  site,
  layout,
  locale,
  services,
  servicesName,
}: {
  site: SiteSeo;
  layout: PublicLayoutData | null;
  locale: DbLocale;
  services: readonly PublicServiceListItem[];
  /** The word for the services section, in the page's language. */
  servicesName: string;
}): JsonLdNode {
  const address = text(layout?.address);
  const servicesUrl = `${canonicalUrl(locale, '')}#services`;
  return {
    ...organizationRef(site, layout),
    '@type': address ? 'ProfessionalService' : 'Organization',
    description: site.description,
    slogan: text(layout?.tagline),
    image: toCanonicalUrl(DEFAULT_SHARE_IMAGE.url),
    email: text(layout?.contactEmail),
    telephone: text(layout?.phone),
    address: address
      ? { '@type': 'PostalAddress', streetAddress: address, addressCountry: ADDRESS_COUNTRY }
      : undefined,
    areaServed: { '@type': 'Country', name: AREA_SERVED[locale] },
    sameAs: list(layout?.socialLinks.map((link) => text(link.url)) ?? []),
    knowsAbout: list(services.map((service) => text(service.title))),
    hasOfferCatalog:
      services.length > 0
        ? {
            '@type': 'OfferCatalog',
            name: servicesName,
            url: servicesUrl,
            itemListElement: services.map((service) => ({
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name: service.title,
                description: text(service.shortDescription),
                url: servicesUrl,
                provider: { '@id': organizationId() },
              },
            })),
          }
        : undefined,
  };
}

/** The website itself, published by the company. */
export function websiteNode(site: SiteSeo, locale: DbLocale): JsonLdNode {
  return {
    '@type': 'WebSite',
    '@id': toCanonicalUrl('/#website'),
    url: toCanonicalUrl('/'),
    name: site.name,
    description: site.description,
    inLanguage: toAppLocale(locale),
    publisher: { '@id': organizationId() },
  };
}

/** The way to a page from the home page, as results show it under the title. */
export function breadcrumbNode(
  locale: DbLocale,
  trail: ReadonlyArray<{ name: string; path: string }>,
): JsonLdNode {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: step.name,
      item: canonicalUrl(locale, step.path),
    })),
  };
}

/** A published team member, as someone who works for the company. */
export function personNode({
  member,
  locale,
  site,
  layout,
}: {
  member: PublicTeamMember;
  locale: DbLocale;
  site: SiteSeo;
  layout: PublicLayoutData | null;
}): JsonLdNode {
  return {
    '@type': 'Person',
    '@id': `${canonicalUrl(locale, TEAM_PATH)}#${member.slug}`,
    name: member.name,
    jobTitle: text(member.position),
    description: text(shortText(member.bio, SEO_DESCRIPTION_MAX * 2)),
    knowsAbout: text(member.expertise),
    image: member.photo?.url,
    sameAs: list([text(member.linkedinUrl)]),
    worksFor: organizationRef(site, layout),
  };
}

/** An article: its headline, summary, image, date, author and publisher. */
export function articleNode({
  article,
  locale,
  path,
  site,
  layout,
}: {
  article: PublicInsightDetail;
  locale: DbLocale;
  path: string;
  site: SiteSeo;
  layout: PublicLayoutData | null;
}): JsonLdNode {
  const url = canonicalUrl(locale, path);
  return {
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: shortText(article.title, HEADLINE_MAX),
    description: text(article.metaDescription) ?? text(article.excerpt),
    // Required for an article in search results: the site's card when it has no cover.
    image: [
      text(article.ogImageUrl) ?? article.cover?.url ?? toCanonicalUrl(DEFAULT_SHARE_IMAGE.url),
    ],
    datePublished: article.publishedAt ?? undefined,
    dateModified: article.updatedAt,
    inLanguage: toAppLocale(locale),
    url,
    mainEntityOfPage: url,
    articleSection: text(article.category?.name),
    author: article.author
      ? { '@type': 'Person', name: article.author.name }
      : organizationRef(site, layout),
    publisher: organizationRef(site, layout),
  };
}

/**
 * A course at the Academy: what it teaches, who runs it, when and where it
 * next takes place, and what it costs. Search engines show courses on their
 * own, and AI answers name them when asked where to learn; a course with
 * no date, place or price simply says less, never a guess.
 */
export function courseNode({
  course,
  locale,
  site,
  layout,
}: {
  course: PublicCourse;
  locale: DbLocale;
  site: SiteSeo;
  layout: PublicLayoutData | null;
}): JsonLdNode {
  const academy = `${canonicalUrl(locale, '')}#academy`;
  const location = text(course.location);
  return {
    '@type': 'Course',
    '@id': `${canonicalUrl(locale, '')}#course-${course.slug}`,
    name: course.title,
    // Required of a course: its summary, else its name.
    description: text(course.summary) ?? course.title,
    url: academy,
    inLanguage: toAppLocale(locale),
    image: course.cover?.url,
    provider: organizationRef(site, layout),
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: course.format === 'ONLINE' ? 'online' : 'onsite',
      startDate: course.startsAt ?? undefined,
      courseWorkload: text(course.duration),
      location: location ? { '@type': 'Place', name: location, address: location } : undefined,
    },
    offers:
      course.priceGel === null
        ? undefined
        : {
            '@type': 'Offer',
            category: course.priceGel === 0 ? 'Free' : 'Paid',
            price: course.priceGel,
            priceCurrency: 'GEL',
            availability:
              course.seatsLeft === 0 ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
            url: academy,
          },
    syllabusSections: list(
      course.syllabus.map((module) => ({
        '@type': 'Syllabus',
        name: module.title,
        description: text(module.description),
        timeRequired: text(module.duration),
      })),
    ),
  };
}

/**
 * A video: its title, summary, poster, date and length, and where it plays
 * (YouTube's player, or the file itself). One with no picture to show is
 * left out: search engines do not list a video without one.
 */
export function videoNode({
  video,
  locale,
  site,
  layout,
}: {
  video: PublicVideo;
  locale: DbLocale;
  site: SiteSeo;
  layout: PublicLayoutData | null;
}): JsonLdNode | null {
  const youtube = youtubeId(video.youtubeUrl);
  const thumbnail = video.poster?.url ?? (youtube ? youtubeThumbnail(youtube) : null);
  if (!thumbnail || (!youtube && !video.fileUrl)) return null;
  return {
    '@type': 'VideoObject',
    '@id': `${canonicalUrl(locale, '')}#video-${video.slug}`,
    name: video.title,
    // Required of a video: its summary, else its name.
    description: text(video.summary) ?? video.title,
    thumbnailUrl: [thumbnail],
    uploadDate: video.publishedAt,
    duration: video.durationMinutes ? `PT${video.durationMinutes}M` : undefined,
    inLanguage: toAppLocale(locale),
    embedUrl: youtube ? `https://www.youtube.com/embed/${youtube}` : undefined,
    contentUrl: youtube ? undefined : (video.fileUrl ?? undefined),
    url: `${canonicalUrl(locale, '')}#videos`,
    publisher: organizationRef(site, layout),
  };
}
