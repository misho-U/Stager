import { z } from 'zod';

import { dbLocaleSchema, type DbLocale } from '@/shared/types/enums';

/** Envelope for every list endpoint, so pagination can be added without a breaking change. */
export const listResponseSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
  });

export type ListResponse<T> = { items: T[]; total: number };

/**
 * Content is authored in both languages at once.
 *
 * Requiring both up front is a deliberate constraint: a record that exists in
 * one language silently 404s or falls back to the wrong copy on the other side
 * of the locale switch, and that bug is invisible to whoever wrote the entry.
 */
export const bothLocales = <T extends z.ZodTypeAny>(translation: T) =>
  z.object({ KA: translation, EN: translation });

export type Translated<T> = Record<DbLocale, T>;

/*
 * TRIMMING — every string a person types is trimmed BEFORE it is validated.
 *
 * Pasted text routinely carries a stray leading or trailing space. Untrimmed,
 * it is stored verbatim (a hero heading went live as "…Businesses. "), and a
 * whitespace-only value passes `.min(1)` as though it were content.
 *
 * Plain text: `z.string().trim()`. The trim runs first, so `.min()`, `.max()`
 * and `.regex()` all see the trimmed value.
 *
 * Emails and URLs: use the helpers below, never `z.email().trim()`. zod 4
 * validates the format BEFORE a chained `.trim()` runs, so that spelling still
 * rejects " me@x.com " — trimming as a plain string and piping into the format
 * is what puts the two in the right order.
 *
 * Leave alone: ids, machine-generated values, honeypots — and passwords, where
 * a leading or trailing space is part of the secret.
 */

/** 254 is the longest an address can be (RFC 5321), whatever the field. */
const EMAIL_MAX = 254;

export const emailInput = (message?: string) =>
  z.string().trim().max(EMAIL_MAX).pipe(z.email(message));

/** May be left blank; "   " is treated as blank rather than as an invalid address. */
export const optionalEmailInput = () =>
  z
    .string()
    .trim()
    .max(EMAIL_MAX)
    .pipe(z.email().or(z.literal('')))
    .nullish();

/*
 * LINKS are web links: http or https, with a real host. `z.url()` alone takes
 * any scheme, so `javascript:alert(1)` passed as a social link and was rendered
 * as an href. React 19 refuses to render such a link today; the schema does
 * not lean on that.
 */

export const urlInput = (message?: string) => z.string().trim().pipe(z.httpUrl(message));

/** May be left blank; "   " is treated as blank rather than as an invalid URL. */
export const optionalUrlInput = () =>
  z
    .string()
    .trim()
    .pipe(z.httpUrl().or(z.literal('')))
    .nullish();

/** SEO fields shared by every translatable record. */
export const seoFieldsSchema = z.object({
  metaTitle: z.string().max(70, 'Search engines truncate titles past ~70 characters').nullable(),
  metaDescription: z
    .string()
    .max(180, 'Search engines truncate descriptions past ~180 characters')
    .nullable(),
  ogMediaId: z.string().nullable(),
});

export const seoInputSchema = z.object({
  metaTitle: z.string().trim().max(70).nullish(),
  metaDescription: z.string().trim().max(180).nullish(),
  ogMediaId: z.string().min(1).nullish(),
});

/** Timestamps cross the wire as ISO-8601 strings, not Date objects. */
export const isoDateTime = z.iso.datetime();

/**
 * A calendar day, "2026-11-15": a course's start, a video's release. A day
 * rather than an instant, so it reads the same in every time zone; stored in
 * a Postgres `date` column. `new Date(value)` is that day's UTC midnight,
 * which formats as the same day in Tbilisi.
 */
export const calendarDate = z.iso.date();

/** A date input's value: a calendar day, or blank for none. */
export const optionalCalendarDateInput = () =>
  z
    .union([z.iso.date(), z.literal('')])
    .nullish()
    .transform((value) => value || null);

type WithoutDefaults<Shape extends z.ZodRawShape> = {
  [Key in keyof Shape]: Shape[Key] extends z.ZodDefault<infer Inner> ? Inner : Shape[Key];
};

/**
 * The PATCH schema for a create schema: every field optional, and a field left
 * out means "unchanged".
 *
 * zod 4 applies `.default()` even inside `.partial()`, so `.partial()` alone
 * filled every omitted field with its default: hiding a social link
 * (`{ isActive: false }`) also reset its order to 0, and any one-field update
 * of a project or service would have set it back to DRAFT. The defaults are
 * for creating; an update leaves what it does not mention alone.
 */
export function partialUpdate<Shape extends z.ZodRawShape>(schema: z.ZodObject<Shape>) {
  const shape: Record<string, z.core.$ZodType> = {};
  for (const [key, field] of Object.entries(schema.shape)) {
    shape[key] = field instanceof z.ZodDefault ? field.unwrap() : field;
  }
  return z.object(shape as unknown as WithoutDefaults<Shape>).partial();
}

/** Common query string for public list endpoints. */
export const publicListQuerySchema = z.object({
  locale: dbLocaleSchema,
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PublicListQuery = z.infer<typeof publicListQuerySchema>;

/** Slug rules: lowercase, digits and single hyphens. Used in URLs, so no unicode. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * No messages of its own, like every schema the dashboard validates with: the
 * dashboard words each problem in its own language from what failed
 * (src/shared/lib/validation-message.ts recognises SLUG_PATTERN).
 */
export const slugSchema = z
  .string()
  // Before the regex: " kitchen-ops" would otherwise fail the pattern check,
  // which says nothing about the space that actually caused it.
  .trim()
  .min(1)
  .max(120)
  .regex(SLUG_PATTERN);

/** Optional YouTube URL — the only video source the site supports. */
export const youtubeUrlSchema = z
  .string()
  .trim()
  // A web link first: the host check alone let `javascript://www.youtube.com/…`
  // through, and this link is rendered as an href ("Watch on YouTube").
  .pipe(z.httpUrl())
  .refine(
    (value) => {
      try {
        const host = new URL(value).hostname.replace(/^www\./, '');
        return host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com';
      } catch {
        return false;
      }
      // The key names the dashboard's message for this check (validation-message.ts).
    },
    { params: { key: 'youtube' } },
  );

/**
 * A YouTube link that may be left blank. A cleared input sends "", which the
 * link check alone rejects, so a saved link could never be removed. Blank
 * (after trimming) means none; anything else must be a YouTube link, and that
 * is the failure reported.
 */
export const optionalYoutubeUrlInput = () =>
  z
    .string()
    .trim()
    .pipe(z.union([youtubeUrlSchema, z.literal('')]))
    .nullish()
    .transform((value) => value || null);

/**
 * The value chosen in an optional dropdown: an id, or an enum member piped on
 * to its own schema. The "none" option sends "", which `.min(1)` alone
 * rejects, so a choice could never be taken back.
 */
export const optionalChoice = () =>
  z
    .union([z.string().min(1), z.literal('')])
    .nullish()
    .transform((value) => value || null);

/** Reference to an uploaded image, or nothing. */
export const mediaIdSchema = z.string().min(1).nullish();
