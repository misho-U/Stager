import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import type { PublicCourse } from '@/entity/course/model/course.model';
import { todayInTbilisi } from '@/shared/lib/calendar-date';
import type { DbLocale } from '@/shared/types/enums';
import { collectionTag, COURSE_CACHE_LIFE } from '@pkg/cache/tags';
import { prisma } from '@pkg/db/prisma';
import {
  fromCalendarDate,
  mediaInclude,
  toCalendarDate,
  toMediaSummary,
} from '@/server/published/serializers';

/**
 * Published courses that have not started, plus those without a date yet:
 * soonest first, undated last. One that has started leaves the site by
 * itself, rather than inviting registrations for a course already running.
 */
export async function listPublicCourses(locale: DbLocale, limit: number, offset: number) {
  'use cache';
  cacheLife(COURSE_CACHE_LIFE);
  cacheTag(collectionTag('course'));

  const where = {
    status: 'PUBLISHED' as const,
    OR: [{ startsAt: null }, { startsAt: { gte: fromCalendarDate(todayInTbilisi()) } }],
  };

  const [rows, total] = await Promise.all([
    prisma.course.findMany({
      where,
      include: {
        coverMedia: mediaInclude,
        translations: { where: { locale } },
        category: { include: { translations: { where: { locale } } } },
      },
      orderBy: [
        { startsAt: { sort: 'asc', nulls: 'last' } },
        { order: 'asc' },
        { createdAt: 'asc' },
      ],
      take: limit,
      skip: offset,
    }),
    prisma.course.count({ where }),
  ]);

  const items: PublicCourse[] = rows.map((row) => {
    const translation = row.translations[0];
    return {
      id: row.id,
      slug: row.slug,
      title: translation?.title ?? '',
      summary: translation?.summary ?? '',
      category: row.category
        ? { slug: row.category.slug, name: row.category.translations[0]?.name ?? '' }
        : null,
      serviceId: row.serviceId,
      format: row.format,
      startsAt: row.startsAt ? toCalendarDate(row.startsAt) : null,
      duration: translation?.duration ?? '',
      location: translation?.location || null,
      seatsTotal: row.seatsTotal,
      seatsLeft: row.seatsLeft,
      priceGel: row.priceGel,
      cover: toMediaSummary(row.coverMedia, locale),
    };
  });

  return { items, total };
}
