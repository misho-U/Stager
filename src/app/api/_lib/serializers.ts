import type { DbLocale } from '@/shared/types/enums';
import { LOCALES } from '@/app/api/_lib/route-helpers';

// Shared with the published reads (src/server/published), where they live.
export {
  fromCalendarDate,
  mediaInclude,
  toCalendarDate,
  toIso,
  toIsoRequired,
  toMediaSummary,
} from '@/server/published/serializers';

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
