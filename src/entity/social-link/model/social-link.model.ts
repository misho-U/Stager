import { z } from 'zod';

import { isoDateTime, listResponseSchema, urlInput } from '@/shared/types/api';
import { socialPlatformSchema } from '@/shared/types/enums';

export const adminSocialLinkSchema = z.object({
  id: z.string(),
  platform: socialPlatformSchema,
  url: z.string(),
  label: z.string().nullable(),
  order: z.number().int(),
  isActive: z.boolean(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export type AdminSocialLink = z.infer<typeof adminSocialLinkSchema>;

export const adminSocialLinkListResponseSchema = listResponseSchema(adminSocialLinkSchema);

/** Public shape drops the timestamps and the inactive rows. */
export const publicSocialLinkSchema = z.object({
  id: z.string(),
  platform: socialPlatformSchema,
  url: z.string(),
  label: z.string().nullable(),
});

export type PublicSocialLink = z.infer<typeof publicSocialLinkSchema>;

export const socialLinkInputSchema = z.object({
  platform: socialPlatformSchema,
  url: urlInput('Enter a full URL, including https://'),
  label: z.string().trim().max(80).nullish(),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

/** Validated values, with schema defaults applied. */
export type SocialLinkInput = z.output<typeof socialLinkInputSchema>;

/** Raw form values, before defaults are applied. See the useForm generics. */
export type SocialLinkFormValues = z.input<typeof socialLinkInputSchema>;

export const socialLinkUpdateInputSchema = socialLinkInputSchema.partial();
export type SocialLinkUpdateInput = z.output<typeof socialLinkUpdateInputSchema>;
