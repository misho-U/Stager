import type { MediaSummary } from '@/entity/media/model/media.model';
import type { DbLocale } from '@/shared/types/enums';
import { LOCALES } from '@/app/api/_lib/route-helpers';

/**
 * Prisma → API shape conversions.
 *
 * Route handlers never return a Prisma record directly. Doing so would leak
 * internal columns (ipHash, supabaseUserId, foreign keys) the moment a column
 * is added, and would ship Date objects that JSON.stringify quietly turns into
 * strings the client schemas do not expect.
 */

type LocaleRow = { locale: DbLocale };

/**
 * Turns the `translations: [{locale: 'KA', ...}, {locale: 'EN', ...}]` array
 * Prisma returns into the `{ KA: {...}, EN: {...} }` object the client uses.
 *
 * `fallback` fills a locale that has no row. Writes always create both, but a
 * record edited before a field existed, or restored from an older backup, can
 * be missing one — and a missing translation must render as empty copy, not
 * crash the dashboard.
 */
export function toTranslationMap<TRow extends LocaleRow, TOut>(
  rows: TRow[],
  project: (row: TRow) => TOut,
  fallback: TOut,
): Record<DbLocale, TOut> {
  const result = {} as Record<DbLocale, TOut>;

  for (const locale of LOCALES) {
    const row = rows.find((candidate) => candidate.locale === locale);
    result[locale] = row ? project(row) : fallback;
  }

  return result;
}

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

/**
 * Builds the nested `upsert` Prisma needs to write both translations at once.
 *
 * `whereKey` is the compound unique index name from the schema, e.g.
 * `projectId_locale`, and `foreignKey` the column inside it.
 */
export function translationUpsert<TData extends object>(
  foreignKey: string,
  foreignId: string,
  whereKey: string,
  data: Record<DbLocale, TData>,
) {
  return LOCALES.map((locale) => ({
    where: { [whereKey]: { [foreignKey]: foreignId, locale } },
    create: { locale, ...data[locale] },
    update: { ...data[locale] },
  }));
}
