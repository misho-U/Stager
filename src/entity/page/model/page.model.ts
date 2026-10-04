import { z } from 'zod';

import { mediaSummarySchema } from '@/entity/media/model/media.model';
import {
  bothLocales,
  listResponseSchema,
  mediaIdSchema,
  seoFieldsSchema,
  seoInputSchema,
} from '@/shared/types/api';
import { pageKeySchema } from '@/shared/types/enums';

/**
 * Editable page copy.
 *
 * Pages and their sections are created by the seed, not by the admin — the
 * structure of a page is a code concern, the words in it are not. The dashboard
 * therefore edits sections but cannot add or remove them, which keeps the
 * frontend's section lookups from ever pointing at nothing.
 */

export const pageSectionTranslationSchema = z.object({
  heading: z.string(),
  subheading: z.string(),
  body: z.string(),
  ctaLabel: z.string(),
  ctaHref: z.string(),
});

export const adminPageSectionSchema = z.object({
  id: z.string(),
  key: z.string(),
  order: z.number().int(),
  isVisible: z.boolean(),
  mediaId: z.string().nullable(),
  media: mediaSummarySchema.nullable(),
  translations: bothLocales(pageSectionTranslationSchema),
});

export type AdminPageSection = z.infer<typeof adminPageSectionSchema>;

export const adminPageSchema = z.object({
  id: z.string(),
  key: pageKeySchema,
  translations: bothLocales(seoFieldsSchema.extend({ title: z.string() })),
  sections: z.array(adminPageSectionSchema),
});

export type AdminPage = z.infer<typeof adminPageSchema>;

export const adminPageListResponseSchema = listResponseSchema(adminPageSchema);

/** Public shape: one locale, sections keyed for direct lookup by the frontend. */
export const publicPageSectionSchema = z.object({
  key: z.string(),
  heading: z.string(),
  subheading: z.string(),
  body: z.string(),
  ctaLabel: z.string(),
  ctaHref: z.string(),
  media: mediaSummarySchema.nullable(),
});

export type PublicPageSection = z.infer<typeof publicPageSectionSchema>;

export const publicPageSchema = z.object({
  key: pageKeySchema,
  title: z.string(),
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
  ogImageUrl: z.string().nullable(),
  sections: z.array(publicPageSectionSchema),
});

export type PublicPage = z.infer<typeof publicPageSchema>;

// --- Input ---

/**
 * Where a section's button points: a page on this site ("/ka/projects"), a
 * section of this page ("#inquiry"), a web address, or an email or phone link.
 * Blank means no button. Nothing that runs (`javascript:`, `data:`), and no
 * "//host" that only looks like a path.
 */
const SECTION_LINK =
  /^(?:https?:\/\/[^\s]+|mailto:[^\s]+|tel:[+\d][\d\s()-]*|\/(?!\/)[^\s]*|#[^\s]*)$/i;

export const pageSectionLinkInput = () =>
  z
    .string()
    .trim()
    .max(300)
    .refine((value) => value === '' || SECTION_LINK.test(value), { params: { key: 'link' } });

export const pageSectionInputSchema = z.object({
  id: z.string().min(1),
  isVisible: z.boolean().optional(),
  mediaId: mediaIdSchema,
  translations: bothLocales(
    z.object({
      heading: z.string().trim().max(300).default(''),
      subheading: z.string().trim().max(1000).default(''),
      body: z.string().trim().max(40_000).default(''),
      ctaLabel: z.string().trim().max(80).default(''),
      ctaHref: pageSectionLinkInput().default(''),
    }),
  ),
});

export const pageUpdateInputSchema = z.object({
  translations: bothLocales(
    seoInputSchema.extend({ title: z.string().trim().max(200).default('') }),
  ).optional(),
  sections: z.array(pageSectionInputSchema).optional(),
});

export type PageUpdateInput = z.infer<typeof pageUpdateInputSchema>;

// --- Home page structure ---

/**
 * The home page's sections by role, keyed as the seed creates them
 * (prisma/seed.ts). A design looks sections up through these names, never
 * through the raw keys, so a renamed key is one edit here.
 */
export const HOME_SECTION_KEYS = {
  hero: 'hero',
  intro: 'intro',
  services: 'what-we-do',
  projects: 'selected-projects',
  why: 'why-stager',
  insights: 'insights',
  cta: 'cta',
} as const;

export type HomeSections = Record<keyof typeof HOME_SECTION_KEYS, PublicPageSection | undefined>;

/**
 * Every home section by role. A section hidden in the dashboard is left out
 * of the public read, so it comes back undefined here, as does everything
 * when the page read failed (`page` is null).
 */
export function homeSections(page: PublicPage | null): HomeSections {
  const find = (key: string) => page?.sections.find((section) => section.key === key);
  return {
    hero: find(HOME_SECTION_KEYS.hero),
    intro: find(HOME_SECTION_KEYS.intro),
    services: find(HOME_SECTION_KEYS.services),
    projects: find(HOME_SECTION_KEYS.projects),
    why: find(HOME_SECTION_KEYS.why),
    insights: find(HOME_SECTION_KEYS.insights),
    cta: find(HOME_SECTION_KEYS.cta),
  };
}
