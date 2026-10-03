import { z } from 'zod';

import { mediaSummarySchema } from '@/entity/media/model/media.model';
import {
  bothLocales,
  calendarDate,
  isoDateTime,
  listResponseSchema,
  mediaIdSchema,
  optionalCalendarDateInput,
  optionalChoice,
  partialUpdate,
  slugSchema,
} from '@/shared/types/api';
import { contentStatusSchema, courseFormatSchema } from '@/shared/types/enums';

/**
 * A STAGER Academy course.
 *
 * "Register" on the site opens the inquiry form preset to Training, so a
 * registration is an inquiry, not a booking: the seat counts are typed in by
 * the owner rather than counted.
 */

export const courseTranslationSchema = z.object({
  title: z.string(),
  summary: z.string(),
  duration: z.string(),
  location: z.string(),
});

export const adminCourseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  categoryId: z.string().nullable(),
  serviceId: z.string().nullable(),
  coverMediaId: z.string().nullable(),
  coverMedia: mediaSummarySchema.nullable(),
  format: courseFormatSchema,
  startsAt: calendarDate.nullable(),
  seatsTotal: z.number().int().nullable(),
  seatsLeft: z.number().int().nullable(),
  priceGel: z.number().int().nullable(),
  status: contentStatusSchema,
  order: z.number().int(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  translations: bothLocales(courseTranslationSchema),
});

export type AdminCourse = z.infer<typeof adminCourseSchema>;

export const adminCourseListResponseSchema = listResponseSchema(adminCourseSchema);

/**
 * A course as the site shows it: published, and not started yet or without a
 * date. Listed soonest first, courses without a date last.
 */
export const publicCourseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  /** The Academy filter it belongs to; null when it has none. */
  category: z.object({ slug: z.string(), name: z.string() }).nullable(),
  /** The consulting service it teaches; that service's section can point here. */
  serviceId: z.string().nullable(),
  format: courseFormatSchema,
  /** The first session's day; null while the next date is not set. */
  startsAt: calendarDate.nullable(),
  /** As written in the dashboard: "2 days", "6 Saturdays". May be empty. */
  duration: z.string(),
  /** Where it takes place; null when not given, as for an online course. */
  location: z.string().nullable(),
  seatsTotal: z.number().int().positive().nullable(),
  /** 0 means fully booked; null means the course does not show seats. */
  seatsLeft: z.number().int().nonnegative().nullable(),
  /** Whole lari; null for a free course. */
  priceGel: z.number().int().nonnegative().nullable(),
  cover: mediaSummarySchema.nullable(),
});

export type PublicCourse = z.infer<typeof publicCourseSchema>;

export const publicCourseListResponseSchema = listResponseSchema(publicCourseSchema);

/** Few enough seats left that the site says so with emphasis. */
export const FEW_SEATS = 5;

/**
 * The course each service points at: the soonest one that names it. Courses
 * arrive soonest first, so the first match is the next to start.
 */
export function relatedCourses(
  services: ReadonlyArray<{ id: string }>,
  courses: readonly PublicCourse[],
): ReadonlyMap<string, PublicCourse> {
  const related = new Map<string, PublicCourse>();
  for (const service of services) {
    const course = courses.find((item) => item.serviceId === service.id);
    if (course) related.set(service.id, course);
  }
  return related;
}

export const courseTranslationInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(600).default(''),
  duration: z.string().trim().max(60).default(''),
  location: z.string().trim().max(160).default(''),
});

const courseFieldsSchema = z.object({
  slug: slugSchema,
  categoryId: optionalChoice(),
  serviceId: optionalChoice(),
  coverMediaId: mediaIdSchema,
  format: courseFormatSchema.default('IN_PERSON'),
  startsAt: optionalCalendarDateInput(),
  seatsTotal: z.number().int().min(1).max(10_000).nullish(),
  seatsLeft: z.number().int().min(0).max(10_000).nullish(),
  priceGel: z.number().int().min(0).max(1_000_000).nullish(),
  status: contentStatusSchema.default('DRAFT'),
  order: z.number().int().min(0).max(100_000).default(0),
  translations: bothLocales(courseTranslationInputSchema),
});

/** More seats left than there are seats is a typing mistake, said at the field. */
function seatsAddUp(course: { seatsTotal?: number | null; seatsLeft?: number | null }) {
  return (
    course.seatsLeft === null ||
    course.seatsLeft === undefined ||
    course.seatsTotal === null ||
    course.seatsTotal === undefined ||
    course.seatsLeft <= course.seatsTotal
  );
}

// The key names the dashboard's message for this check (validation-message.ts).
const SEATS_CHECK = { path: ['seatsLeft'], params: { key: 'seatsLeftOverTotal' } };

export const courseInputSchema = courseFieldsSchema.refine(seatsAddUp, SEATS_CHECK);

/** Validated values, with schema defaults applied. */
export type CourseInput = z.output<typeof courseInputSchema>;

/** Raw form values, before defaults are applied. See the useForm generics. */
export type CourseFormValues = z.input<typeof courseInputSchema>;

// zod refuses .partial() on a refined object, so the update schema starts
// from the plain fields and repeats the check.
export const courseUpdateInputSchema = partialUpdate(courseFieldsSchema).refine(
  seatsAddUp,
  SEATS_CHECK,
);
export type CourseUpdateInput = z.output<typeof courseUpdateInputSchema>;

/**
 * The key the Academy filters a course by: its category, or '' for none, which
 * only "All" shows. Prefixed, so a category with the slug "all" cannot be
 * mistaken for the filter that shows everything.
 */
export function courseCategoryKey(course: Pick<PublicCourse, 'category'>): string {
  return course.category ? `category:${course.category.slug}` : '';
}

/** The categories that have courses, in the order they first appear, with how many each. */
export function courseCategories(
  courses: readonly PublicCourse[],
): Array<{ key: string; name: string; count: number }> {
  const found = new Map<string, { key: string; name: string; count: number }>();
  for (const course of courses) {
    if (!course.category) continue;
    const key = courseCategoryKey(course);
    const entry = found.get(key) ?? { key, name: course.category.name, count: 0 };
    entry.count += 1;
    found.set(key, entry);
  }
  return [...found.values()];
}
