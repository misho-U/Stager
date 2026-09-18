import { z } from 'zod';

import { mediaSummarySchema } from '@/entity/media/model/media.model';
import { publicSocialLinkSchema } from '@/entity/social-link/model/social-link.model';
import { bothLocales, mediaIdSchema, seoFieldsSchema, seoInputSchema } from '@/shared/types/api';

export const siteSettingTranslationSchema = seoFieldsSchema.extend({
  siteName: z.string(),
  tagline: z.string(),
  address: z.string(),
  footerText: z.string(),
});

export const adminSiteSettingSchema = z.object({
  id: z.string(),
  logoMediaId: z.string().nullable(),
  logoMedia: mediaSummarySchema.nullable(),
  logoLightMediaId: z.string().nullable(),
  logoLightMedia: mediaSummarySchema.nullable(),
  contactEmail: z.string().nullable(),
  phone: z.string().nullable(),
  inquiryInboxEmail: z.string().nullable(),
  translations: bothLocales(siteSettingTranslationSchema),
});

export type AdminSiteSetting = z.infer<typeof adminSiteSettingSchema>;

/**
 * Everything the shared layout needs, in one request.
 *
 * Header and footer render on every page, so this is fetched once per render
 * under the LAYOUT cache tag rather than as three separate calls.
 */
export const publicLayoutDataSchema = z.object({
  siteName: z.string(),
  tagline: z.string(),
  footerText: z.string(),
  address: z.string(),
  contactEmail: z.string().nullable(),
  phone: z.string().nullable(),
  logo: mediaSummarySchema.nullable(),
  logoLight: mediaSummarySchema.nullable(),
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
  socialLinks: z.array(publicSocialLinkSchema),
});

export type PublicLayoutData = z.infer<typeof publicLayoutDataSchema>;

export const siteSettingUpdateInputSchema = z.object({
  logoMediaId: mediaIdSchema,
  logoLightMediaId: mediaIdSchema,
  contactEmail: z.email().nullish().or(z.literal('')),
  phone: z.string().max(60).nullish(),
  inquiryInboxEmail: z.email().nullish().or(z.literal('')),
  translations: bothLocales(
    seoInputSchema.extend({
      siteName: z.string().min(1).max(120).default('STAGER'),
      tagline: z.string().max(300).default(''),
      address: z.string().max(300).default(''),
      footerText: z.string().max(2000).default(''),
    }),
  ).optional(),
});

/** Validated values sent to the API. */
export type SiteSettingUpdateInput = z.output<typeof siteSettingUpdateInputSchema>;

/** Raw form values, before defaults are applied. See the useForm generics. */
export type SiteSettingFormValues = z.input<typeof siteSettingUpdateInputSchema>;
