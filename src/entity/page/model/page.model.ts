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

export const pageSectionInputSchema = z.object({
  id: z.string().min(1),
  isVisible: z.boolean().optional(),
  mediaId: mediaIdSchema,
  translations: bothLocales(
    z.object({
      heading: z.string().max(300).default(''),
      subheading: z.string().max(1000).default(''),
      body: z.string().max(40_000).default(''),
      ctaLabel: z.string().max(80).default(''),
      ctaHref: z.string().max(300).default(''),
    }),
  ),
});

export const pageUpdateInputSchema = z.object({
  translations: bothLocales(seoInputSchema.extend({ title: z.string().max(200).default('') }))
    .optional(),
  sections: z.array(pageSectionInputSchema).optional(),
});

export type PageUpdateInput = z.infer<typeof pageUpdateInputSchema>;
