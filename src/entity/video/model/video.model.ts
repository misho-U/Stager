import { z } from 'zod';

import {
  bothLocales,
  calendarDate,
  isoDateTime,
  listResponseSchema,
  optionalChoice,
  optionalYoutubeUrlInput,
  partialUpdate,
  slugSchema,
} from '@/shared/types/api';
import { contentStatusSchema, videoKindSchema } from '@/shared/types/enums';

/**
 * A video on STAGER's channel.
 *
 * Never an uploaded file: each is a YouTube link, played through the
 * privacy-preserving embed (the CSP allows only that host).
 */

export const videoTranslationSchema = z.object({
  title: z.string(),
  summary: z.string(),
});

export const adminVideoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  youtubeUrl: z.string().nullable(),
  kind: videoKindSchema.nullable(),
  publishedAt: calendarDate,
  durationMinutes: z.number().int().nullable(),
  status: contentStatusSchema,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  translations: bothLocales(videoTranslationSchema),
});

export type AdminVideo = z.infer<typeof adminVideoSchema>;

export const adminVideoListResponseSchema = listResponseSchema(adminVideoSchema);

/** A published video as the site shows it. Listed newest first. */
export const publicVideoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  /** What kind of programme it is; null when none was chosen. */
  kind: videoKindSchema.nullable(),
  /** A youtube.com or youtu.be link; null for an entry still waiting for one. */
  youtubeUrl: z.string().nullable(),
  /** The day it came out. */
  publishedAt: calendarDate,
  durationMinutes: z.number().int().positive().nullable(),
});

export type PublicVideo = z.infer<typeof publicVideoSchema>;

export const publicVideoListResponseSchema = listResponseSchema(publicVideoSchema);

export const videoTranslationInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(600).default(''),
});

export const videoInputSchema = z.object({
  slug: slugSchema,
  youtubeUrl: optionalYoutubeUrlInput(),
  // A dropdown with a "none" option, so blank is a choice, not an error.
  kind: optionalChoice().pipe(videoKindSchema.nullable()),
  publishedAt: calendarDate,
  durationMinutes: z.number().int().min(1).max(1_000).nullish(),
  status: contentStatusSchema.default('DRAFT'),
  translations: bothLocales(videoTranslationInputSchema),
});

/** Validated values, with schema defaults applied. */
export type VideoInput = z.output<typeof videoInputSchema>;

/** Raw form values, before defaults are applied. See the useForm generics. */
export type VideoFormValues = z.input<typeof videoInputSchema>;

export const videoUpdateInputSchema = partialUpdate(videoInputSchema);
export type VideoUpdateInput = z.output<typeof videoUpdateInputSchema>;
