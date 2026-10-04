import { z } from 'zod';

import {
  bothLocales,
  isoDateTime,
  listResponseSchema,
  partialUpdate,
  slugSchema,
} from '@/shared/types/api';

/**
 * What the Academy's courses are grouped by: the filter on the site. Separate
 * from article categories (`entity/category`), and added by the owner as the
 * Academy grows.
 */
export const adminCourseCategorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  order: z.number().int(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  translations: bothLocales(z.object({ name: z.string() })),
});

export type AdminCourseCategory = z.infer<typeof adminCourseCategorySchema>;

export const adminCourseCategoryListResponseSchema = listResponseSchema(adminCourseCategorySchema);

export const courseCategoryInputSchema = z.object({
  slug: slugSchema,
  order: z.number().int().min(0).max(100_000).default(0),
  translations: bothLocales(z.object({ name: z.string().trim().min(1).max(120) })),
});

/** Validated values, with schema defaults applied. */
export type CourseCategoryInput = z.output<typeof courseCategoryInputSchema>;

/** Raw form values, before defaults are applied. See the useForm generics. */
export type CourseCategoryFormValues = z.input<typeof courseCategoryInputSchema>;

export const courseCategoryUpdateInputSchema = partialUpdate(courseCategoryInputSchema);
export type CourseCategoryUpdateInput = z.output<typeof courseCategoryUpdateInputSchema>;
