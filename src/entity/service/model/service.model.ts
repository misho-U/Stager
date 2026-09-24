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

export const serviceTranslationSchema = seoFieldsSchema.extend({
  title: z.string(),
  shortDescription: z.string(),
  body: z.string(),
});

export const adminServiceSchema = z.object({
  id: z.string(),
  slug: z.string(),
  icon: z.string().nullable(),
  coverMediaId: z.string().nullable(),
  coverMedia: mediaSummarySchema.nullable(),
  status: contentStatusSchema,
  order: z.number().int(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  translations: bothLocales(serviceTranslationSchema),
});

export type AdminService = z.infer<typeof adminServiceSchema>;

export const adminServiceListResponseSchema = listResponseSchema(adminServiceSchema);

export const publicServiceSchema = z.object({
  id: z.string(),
  slug: z.string(),
  icon: z.string().nullable(),
  title: z.string(),
  shortDescription: z.string(),
  body: z.string(),
  cover: mediaSummarySchema.nullable(),
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
});

export type PublicService = z.infer<typeof publicServiceSchema>;

export const publicServiceListResponseSchema = listResponseSchema(publicServiceSchema);

export const serviceTranslationInputSchema = seoInputSchema.extend({
  title: z.string().trim().min(1, 'Title is required').max(200),
  shortDescription: z.string().trim().max(600).default(''),
  body: z.string().trim().max(80_000).default(''),
});

export const serviceInputSchema = z.object({
  slug: slugSchema,
  icon: z.string().trim().max(60).nullish(),
  coverMediaId: mediaIdSchema,
  status: contentStatusSchema.default('DRAFT'),
  order: z.number().int().min(0).default(0),
  translations: bothLocales(serviceTranslationInputSchema),
});

/** Validated values, with schema defaults applied. */
export type ServiceInput = z.output<typeof serviceInputSchema>;

/** Raw form values, before defaults are applied. See the useForm generics. */
export type ServiceFormValues = z.input<typeof serviceInputSchema>;

export const serviceUpdateInputSchema = serviceInputSchema.partial();
export type ServiceUpdateInput = z.output<typeof serviceUpdateInputSchema>;
