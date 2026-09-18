import { z } from 'zod';

import { mediaSummarySchema } from '@/entity/media/model/media.model';
import {
  bothLocales,
  isoDateTime,
  listResponseSchema,
  mediaIdSchema,
  seoFieldsSchema,
  seoInputSchema,
  slugSchema,
  youtubeUrlSchema,
} from '@/shared/types/api';
import { contentStatusSchema } from '@/shared/types/enums';

// ---------------------------------------------------------------------------
// Admin shape — both locales, drafts included
// ---------------------------------------------------------------------------

export const projectTranslationSchema = seoFieldsSchema.extend({
  title: z.string(),
  summary: z.string(),
  body: z.string(),
});

export const adminProjectSchema = z.object({
  id: z.string(),
  slug: z.string(),
  coverMediaId: z.string().nullable(),
  coverMedia: mediaSummarySchema.nullable(),
  youtubeUrl: z.string().nullable(),
  client: z.string().nullable(),
  location: z.string().nullable(),
  year: z.number().int().nullable(),
  status: contentStatusSchema,
  featured: z.boolean(),
  order: z.number().int(),
  publishedAt: isoDateTime.nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  translations: bothLocales(projectTranslationSchema),
  serviceIds: z.array(z.string()),
  gallery: z.array(mediaSummarySchema),
});

export type AdminProject = z.infer<typeof adminProjectSchema>;

export const adminProjectListResponseSchema = listResponseSchema(adminProjectSchema);

// ---------------------------------------------------------------------------
// Public shape — one locale, already resolved, published only
// ---------------------------------------------------------------------------

export const publicProjectListItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  cover: mediaSummarySchema.nullable(),
  year: z.number().int().nullable(),
  location: z.string().nullable(),
  client: z.string().nullable(),
  featured: z.boolean(),
  publishedAt: isoDateTime.nullable(),
});

export type PublicProjectListItem = z.infer<typeof publicProjectListItemSchema>;

export const publicProjectDetailSchema = publicProjectListItemSchema.extend({
  body: z.string(),
  youtubeUrl: z.string().nullable(),
  gallery: z.array(mediaSummarySchema),
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
  ogImageUrl: z.string().nullable(),
  services: z.array(z.object({ slug: z.string(), title: z.string() })),
});

export type PublicProjectDetail = z.infer<typeof publicProjectDetailSchema>;

export const publicProjectListResponseSchema = listResponseSchema(publicProjectListItemSchema);

// ---------------------------------------------------------------------------
// Admin input
// ---------------------------------------------------------------------------

export const projectTranslationInputSchema = seoInputSchema.extend({
  title: z.string().min(1, 'Title is required').max(200),
  summary: z.string().max(600).default(''),
  /** Sanitized server-side before it is stored — see pkg/security/sanitize. */
  body: z.string().max(80_000).default(''),
});

export const projectInputSchema = z.object({
  slug: slugSchema,
  coverMediaId: mediaIdSchema,
  youtubeUrl: youtubeUrlSchema.nullish(),
  client: z.string().max(160).nullish(),
  location: z.string().max(160).nullish(),
  year: z.number().int().min(1900).max(2200).nullish(),
  status: contentStatusSchema.default('DRAFT'),
  featured: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
  translations: bothLocales(projectTranslationInputSchema),
  serviceIds: z.array(z.string().min(1)).default([]),
  galleryMediaIds: z.array(z.string().min(1)).default([]),
});

/** What the API receives and the repository writes (defaults applied). */
export type ProjectInput = z.output<typeof projectInputSchema>;

/**
 * What the form holds before validation.
 *
 * Fields with `.default()` are optional on the way in and guaranteed on the way
 * out, so react-hook-form must be typed with both — see the useForm generics in
 * admin-project-form.service.ts.
 */
export type ProjectFormValues = z.input<typeof projectInputSchema>;

/** PATCH accepts any subset; the route merges it onto the stored record. */
export const projectUpdateInputSchema = projectInputSchema.partial();

export type ProjectUpdateInput = z.output<typeof projectUpdateInputSchema>;
