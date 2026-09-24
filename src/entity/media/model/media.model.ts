import { z } from 'zod';

import { bothLocales, isoDateTime, listResponseSchema } from '@/shared/types/api';

/**
 * A single uploaded image.
 *
 * Videos are never Media records — they are YouTube URLs on the owning entity.
 * See the note in prisma/schema.prisma.
 */
export const mediaSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  pathname: z.string(),
  contentType: z.string(),
  size: z.number().int().nonnegative(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  blurDataUrl: z.string().nullable(),
  createdAt: isoDateTime,
  translations: bothLocales(
    z.object({
      alt: z.string(),
      caption: z.string(),
    }),
  ),
});

export type Media = z.infer<typeof mediaSchema>;

/** Trimmed shape embedded in other entities' responses. */
export const mediaSummarySchema = z.object({
  id: z.string(),
  url: z.string().url(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  blurDataUrl: z.string().nullable(),
  alt: z.string(),
});

export type MediaSummary = z.infer<typeof mediaSummarySchema>;

export const mediaListResponseSchema = listResponseSchema(mediaSchema);

/** Alt text is required — an image with no alt text is a bug, not a preference. */
export const mediaTranslationInputSchema = z.object({
  alt: z.string().trim().max(300),
  caption: z.string().trim().max(500).default(''),
});

export const mediaUpdateInputSchema = z.object({
  translations: bothLocales(mediaTranslationInputSchema),
});

export type MediaUpdateInput = z.infer<typeof mediaUpdateInputSchema>;

/**
 * Metadata the browser sends after Vercel Blob accepts the file. The URL and
 * pathname come back from Blob itself and are recorded server-side, so this
 * payload cannot be used to point a Media row at an arbitrary host.
 */
export const mediaRegisterInputSchema = z.object({
  url: z.string().url(),
  pathname: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
  width: z.number().int().positive().nullish(),
  height: z.number().int().positive().nullish(),
  blurDataUrl: z.string().nullish(),
  alt: z.string().trim().max(300).default(''),
});

export type MediaRegisterInput = z.infer<typeof mediaRegisterInputSchema>;
