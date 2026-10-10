import { z } from 'zod';

import { bothLocales, isoDateTime, listResponseSchema, partialUpdate } from '@/shared/types/api';

/**
 * The company in figures, under the home page's hero: "20+" years in
 * professional kitchens, "150" projects. The value is text, so a "+" or a
 * comma fits; the site counts up to the number it starts with.
 */
export const adminStatSchema = z.object({
  id: z.string(),
  value: z.string(),
  order: z.number().int(),
  isActive: z.boolean(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  translations: bothLocales(z.object({ label: z.string() })),
});

export type AdminStat = z.infer<typeof adminStatSchema>;

export const adminStatListResponseSchema = listResponseSchema(adminStatSchema);

/** One figure as the site shows it, in one language, active only. */
export const publicStatSchema = z.object({
  id: z.string(),
  value: z.string(),
  label: z.string(),
});

export type PublicStat = z.infer<typeof publicStatSchema>;

export const publicStatListResponseSchema = listResponseSchema(publicStatSchema);

/** The longest a value may be: room for "1,200+", not for a sentence. */
export const STAT_VALUE_MAX = 12;

export const statInputSchema = z.object({
  value: z.string().trim().min(1).max(STAT_VALUE_MAX),
  order: z.number().int().min(0).max(100_000).default(0),
  isActive: z.boolean().default(true),
  translations: bothLocales(z.object({ label: z.string().trim().min(1).max(80) })),
});

/** Validated values, with schema defaults applied. */
export type StatInput = z.output<typeof statInputSchema>;

/** Raw form values, before defaults are applied. See the useForm generics. */
export type StatFormValues = z.input<typeof statInputSchema>;

export const statUpdateInputSchema = partialUpdate(statInputSchema);
export type StatUpdateInput = z.output<typeof statUpdateInputSchema>;

/**
 * The number a value starts with, for the count-up ("20+" is 20, "1,200" is
 * 1200), with what comes before and after it, and whether it was written with
 * thousands separators; null when it holds no number.
 */
export function splitStatValue(
  value: string,
): { before: string; number: number; after: string; grouped: boolean } | null {
  const match = /^(\D*?)(\d{1,3}(?:,\d{3})+|\d+)(.*)$/.exec(value.trim());
  if (!match) return null;
  const [, before = '', digits = '', after = ''] = match;
  const number = Number(digits.replace(/,/g, ''));
  return Number.isSafeInteger(number)
    ? { before, number, after, grouped: digits.includes(',') }
    : null;
}
