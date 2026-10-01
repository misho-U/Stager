import { z } from 'zod';

import { mediaSummarySchema } from '@/entity/media/model/media.model';
import { isoDateTime } from '@/shared/types/api';

/**
 * A Culinary Academy course, as the public site shows it.
 *
 * The dashboard does not manage courses yet: while the home page designs are
 * compared, the entries come from `home-page.samples.ts` and are marked as
 * samples on the page. This is the shape the public API returns once the
 * dashboard does, so the designs read the same fields either way.
 */

/** What a course is about; the Academy's filter chips. */
export const COURSE_CATEGORIES = ['kitchen', 'management', 'food-safety', 'hospitality'] as const;
export type CourseCategory = (typeof COURSE_CATEGORIES)[number];

export const COURSE_FORMATS = ['in-person', 'online'] as const;
export type CourseFormat = (typeof COURSE_FORMATS)[number];

export const publicCourseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  category: z.enum(COURSE_CATEGORIES),
  format: z.enum(COURSE_FORMATS),
  /** When the first session starts. */
  startsAt: isoDateTime,
  /** How long it runs, as written in the dashboard: "2 days", "4 weeks". */
  duration: z.string(),
  /** Where it takes place; empty for an online course. */
  location: z.string().nullable(),
  seatsTotal: z.number().int().positive().nullable(),
  /** 0 means fully booked; null means the course does not count seats. */
  seatsLeft: z.number().int().nonnegative().nullable(),
  /** Whole lari; null for a free course. */
  priceGel: z.number().int().nonnegative().nullable(),
  cover: mediaSummarySchema.nullable(),
});

export type PublicCourse = z.infer<typeof publicCourseSchema>;

/** Few enough seats left that the page says so with emphasis. */
export const FEW_SEATS = 5;

/**
 * Which Academy category teaches what a consulting service does, by the
 * service's icon key (the only stable key a service has besides its slug).
 * A service's panel can then point at the next course on the same subject.
 */
const CATEGORY_BY_SERVICE_ICON: Partial<Record<string, CourseCategory>> = {
  concept: 'management',
  menu: 'management',
  kitchen: 'kitchen',
  training: 'hospitality',
  haccp: 'food-safety',
};

export function courseCategoryForService(icon: string | null): CourseCategory | null {
  return (icon && CATEGORY_BY_SERVICE_ICON[icon]) || null;
}

/**
 * The course each service points at, by service id: the next one on its
 * subject that no service before it has taken. Two services on one subject
 * would otherwise both name the same course; a service left without one of
 * its own names none.
 */
export function relatedCourses(
  services: ReadonlyArray<{ id: string; icon: string | null }>,
  courses: readonly PublicCourse[],
): ReadonlyMap<string, PublicCourse> {
  const related = new Map<string, PublicCourse>();
  const taken = new Set<string>();
  for (const service of services) {
    const category = courseCategoryForService(service.icon);
    const course = courses.find((item) => item.category === category && !taken.has(item.id));
    if (!course) continue;
    related.set(service.id, course);
    taken.add(course.id);
  }
  return related;
}
