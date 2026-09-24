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
} from '@/shared/types/api';
import { contentStatusSchema } from '@/shared/types/enums';

export const insightTranslationSchema = seoFieldsSchema.extend({
  title: z.string(),
  excerpt: z.string(),
  body: z.string(),
});

export const adminInsightSchema = z.object({
  id: z.string(),
  slug: z.string(),
  coverMediaId: z.string().nullable(),
  coverMedia: mediaSummarySchema.nullable(),
  categoryId: z.string().nullable(),
  authorId: z.string().nullable(),
  /** The brief asks for articles that can be published without an author. */
  showAuthor: z.boolean(),
  readingMinutes: z.number().int().nullable(),
  status: contentStatusSchema,
  publishedAt: isoDateTime.nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  translations: bothLocales(insightTranslationSchema),
});

export type AdminInsight = z.infer<typeof adminInsightSchema>;

export const adminInsightListResponseSchema = listResponseSchema(adminInsightSchema);

export const publicInsightListItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string(),
  cover: mediaSummarySchema.nullable(),
  category: z.object({ slug: z.string(), name: z.string() }).nullable(),
  /** Null when the article is published anonymously. */
  author: z.object({ slug: z.string(), name: z.string() }).nullable(),
  readingMinutes: z.number().int().nullable(),
  publishedAt: isoDateTime.nullable(),
});

export type PublicInsightListItem = z.infer<typeof publicInsightListItemSchema>;

export const publicInsightDetailSchema = publicInsightListItemSchema.extend({
  body: z.string(),
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
  ogImageUrl: z.string().nullable(),
});

export type PublicInsightDetail = z.infer<typeof publicInsightDetailSchema>;

export const publicInsightListResponseSchema = listResponseSchema(publicInsightListItemSchema);

export const insightTranslationInputSchema = seoInputSchema.extend({
  title: z.string().trim().min(1, 'Title is required').max(200),
  excerpt: z.string().trim().max(600).default(''),
  body: z.string().trim().max(200_000).default(''),
});

export const insightInputSchema = z.object({
  slug: slugSchema,
  coverMediaId: mediaIdSchema,
  categoryId: z.string().min(1).nullish(),
  authorId: z.string().min(1).nullish(),
  showAuthor: z.boolean().default(true),
  readingMinutes: z.number().int().min(1).max(240).nullish(),
  status: contentStatusSchema.default('DRAFT'),
  publishedAt: isoDateTime.nullish(),
  translations: bothLocales(insightTranslationInputSchema),
});

/** Validated values, with schema defaults applied. */
export type InsightInput = z.output<typeof insightInputSchema>;

/** Raw form values, before defaults are applied. See the useForm generics. */
export type InsightFormValues = z.input<typeof insightInputSchema>;

export const insightUpdateInputSchema = insightInputSchema.partial();
export type InsightUpdateInput = z.output<typeof insightUpdateInputSchema>;
