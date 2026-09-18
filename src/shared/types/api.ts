import { z } from 'zod';

import { dbLocaleSchema, type DbLocale } from '@/shared/types/enums';

/** Envelope for every list endpoint, so pagination can be added without a breaking change. */
export const listResponseSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
  });

export type ListResponse<T> = { items: T[]; total: number };

/**
 * Content is authored in both languages at once.
 *
 * Requiring both up front is a deliberate constraint: a record that exists in
 * one language silently 404s or falls back to the wrong copy on the other side
 * of the locale switch, and that bug is invisible to whoever wrote the entry.
 */
export const bothLocales = <T extends z.ZodTypeAny>(translation: T) =>
  z.object({ KA: translation, EN: translation });

export type Translated<T> = Record<DbLocale, T>;

/** SEO fields shared by every translatable record. */
export const seoFieldsSchema = z.object({
  metaTitle: z.string().max(70, 'Search engines truncate titles past ~70 characters').nullable(),
  metaDescription: z
    .string()
    .max(180, 'Search engines truncate descriptions past ~180 characters')
    .nullable(),
  ogMediaId: z.string().nullable(),
});

export const seoInputSchema = z.object({
  metaTitle: z.string().max(70).nullish(),
  metaDescription: z.string().max(180).nullish(),
  ogMediaId: z.string().min(1).nullish(),
});

/** Timestamps cross the wire as ISO-8601 strings, not Date objects. */
export const isoDateTime = z.iso.datetime();

/** Common query string for public list endpoints. */
export const publicListQuerySchema = z.object({
  locale: dbLocaleSchema,
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PublicListQuery = z.infer<typeof publicListQuerySchema>;

/** Slug rules: lowercase, digits and single hyphens. Used in URLs, so no unicode. */
export const slugSchema = z
  .string()
  .min(1, 'Slug is required')
  .max(120)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Use lowercase letters, numbers and hyphens only (e.g. "kitchen-operations")',
  );

/** Optional YouTube URL — the only video source the site supports. */
export const youtubeUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    try {
      const host = new URL(value).hostname.replace(/^www\./, '');
      return host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com';
    } catch {
      return false;
    }
  }, 'Must be a youtube.com or youtu.be link');

/** Reference to an uploaded image, or nothing. */
export const mediaIdSchema = z.string().min(1).nullish();
