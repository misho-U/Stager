import 'server-only';

import type { MediaSummary } from '@/entity/media/model/media.model';
import type { DbLocale } from '@/shared/types/enums';

/**
 * Prisma → response shape conversions that the published reads share with
 * the dashboard's repositories (which re-export them from
 * app/api/_lib/serializers.ts). Pure functions: nothing here touches the
 * database.
 */

type MediaRecord = {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
  translations: Array<{ locale: DbLocale; alt: string }>;
};

/** Compact media shape embedded in other entities' responses. */
export function toMediaSummary(
  media: MediaRecord | null | undefined,
  locale: DbLocale = 'KA',
): MediaSummary | null {
  if (!media) return null;

  const preferred = media.translations.find((row) => row.locale === locale);
  const anyTranslation = media.translations.find((row) => row.alt.length > 0);

  return {
    id: media.id,
    url: media.url,
    width: media.width,
    height: media.height,
    blurDataUrl: media.blurDataUrl,
    // Fall back to the other language's alt text rather than none: imperfect
    // alt text is far better for a screen reader than an empty string.
    alt: preferred?.alt || anyTranslation?.alt || '',
  };
}

/** Dates cross the wire as ISO strings. */
export function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

/** For non-nullable timestamps (createdAt, updatedAt). */
export function toIsoRequired(value: Date): string {
  return value.toISOString();
}

/**
 * A Postgres `date` column (a course's start, a video's release) reaches
 * Prisma as that day's UTC midnight, and leaves the API as "2026-11-15".
 */
export function toCalendarDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** "2026-11-15" as the Date Prisma writes to a `date` column as that day. */
export function fromCalendarDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Prisma `include` fragment for any media relation. */
export const mediaInclude = {
  select: {
    id: true,
    url: true,
    width: true,
    height: true,
    blurDataUrl: true,
    translations: { select: { locale: true, alt: true } },
  },
} as const;
