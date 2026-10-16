import { z } from 'zod';

import { mediaSummarySchema } from '@/entity/media/model/media.model';
import {
  bothLocales,
  calendarDate,
  isoDateTime,
  listResponseSchema,
  mediaIdSchema,
  optionalChoice,
  optionalYoutubeUrlInput,
  partialUpdate,
  slugSchema,
} from '@/shared/types/api';
import { contentStatusSchema, videoKindSchema } from '@/shared/types/enums';

/**
 * A video on STAGER's channel.
 *
 * Either a YouTube link, played through the privacy-preserving embed, or a
 * file uploaded from the dashboard and played from this project's blob store
 * (`media-src` in the CSP). Never both: the dashboard's switch saves one and
 * clears the other.
 */

/** An uploaded video file, as the store reported it. */
export const videoFileSchema = z.object({
  url: z.string(),
  contentType: z.string(),
  size: z.number().int(),
});

export type VideoFile = z.infer<typeof videoFileSchema>;

export const videoTranslationSchema = z.object({
  title: z.string(),
  summary: z.string(),
});

export const adminVideoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  youtubeUrl: z.string().nullable(),
  file: videoFileSchema.nullable(),
  posterMediaId: z.string().nullable(),
  posterMedia: mediaSummarySchema.nullable(),
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
  /** An uploaded file to play instead; null for a YouTube video. */
  fileUrl: z.string().nullable(),
  /** The cover chosen in the dashboard; null shows YouTube's, or the file's first frame. */
  poster: mediaSummarySchema.nullable(),
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
  /**
   * The uploaded file's address, as the browser got it back from the store.
   * Only a claim: the server checks it is this project's store and reads the
   * type and size from there (app/api/_lib/uploaded-video.ts). Null removes
   * the file.
   */
  fileUrl: z.url().nullish(),
  posterMediaId: mediaIdSchema,
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
