import { z } from 'zod';

import { isoDateTime } from '@/shared/types/api';

/**
 * A video on STAGER's channel, as the public site shows it.
 *
 * Videos are never uploaded files: each is a YouTube link, played through the
 * privacy-preserving embed (the CSP allows only that host). The dashboard does
 * not manage videos yet; while the home page designs are compared the entries
 * come from `home-page.samples.ts` and are marked as samples on the page.
 */

/** What kind of programme it is; shown with each video. */
export const VIDEO_KINDS = ['episode', 'podcast', 'masterclass'] as const;
export type VideoKind = (typeof VIDEO_KINDS)[number];

export const publicVideoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  kind: z.enum(VIDEO_KINDS),
  /** A youtube.com or youtu.be link; null for an entry still waiting for one. */
  youtubeUrl: z.string().nullable(),
  publishedAt: isoDateTime,
  durationMinutes: z.number().int().positive().nullable(),
});

export type PublicVideo = z.infer<typeof publicVideoSchema>;
