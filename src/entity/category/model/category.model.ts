import { z } from 'zod';

import { bothLocales, isoDateTime, listResponseSchema, slugSchema } from '@/shared/types/api';

export const adminCategorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  order: z.number().int(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  translations: bothLocales(z.object({ name: z.string() })),
});

export type AdminCategory = z.infer<typeof adminCategorySchema>;

export const adminCategoryListResponseSchema = listResponseSchema(adminCategorySchema);

export const publicCategorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
});

export type PublicCategory = z.infer<typeof publicCategorySchema>;

export const publicCategoryListResponseSchema = listResponseSchema(publicCategorySchema);

export const categoryInputSchema = z.object({
  slug: slugSchema,
  order: z.number().int().min(0).default(0),
  translations: bothLocales(
    z.object({ name: z.string().trim().min(1, 'Name is required').max(120) }),
  ),
});

/** Validated values, with schema defaults applied. */
export type CategoryInput = z.output<typeof categoryInputSchema>;

/** Raw form values, before defaults are applied. See the useForm generics. */
export type CategoryFormValues = z.input<typeof categoryInputSchema>;

export const categoryUpdateInputSchema = categoryInputSchema.partial();
export type CategoryUpdateInput = z.output<typeof categoryUpdateInputSchema>;
