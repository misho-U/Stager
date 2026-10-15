import {
  fromCalendarDate,
  mediaInclude,
  toCalendarDate,
  toIsoRequired,
  toMediaSummary,
  toTranslationMap,
  translationUpsert,
} from '@/app/api/_lib/serializers';
import type {
  AdminCourse,
  CourseInput,
  CourseUpdateInput,
} from '@/entity/course/model/course.model';
import { prisma } from '@pkg/db/prisma';

const adminInclude = {
  coverMedia: mediaInclude,
  translations: true,
  modules: { orderBy: { order: 'asc' }, include: { translations: true } },
} as const;

const EMPTY_TRANSLATION = { title: '', summary: '', duration: '', location: '' };
const EMPTY_MODULE_TRANSLATION = { title: '', duration: '', description: '' };

type AdminRow = Awaited<
  ReturnType<typeof prisma.course.findFirstOrThrow<{ include: typeof adminInclude }>>
>;

function toAdminCourse(row: AdminRow): AdminCourse {
  return {
    id: row.id,
    slug: row.slug,
    categoryId: row.categoryId,
    serviceId: row.serviceId,
    coverMediaId: row.coverMediaId,
    coverMedia: toMediaSummary(row.coverMedia),
    format: row.format,
    startsAt: row.startsAt ? toCalendarDate(row.startsAt) : null,
    seatsTotal: row.seatsTotal,
    seatsLeft: row.seatsLeft,
    priceGel: row.priceGel,
    status: row.status,
    order: row.order,
    createdAt: toIsoRequired(row.createdAt),
    updatedAt: toIsoRequired(row.updatedAt),
    translations: toTranslationMap(
      row.translations,
      (translation) => ({
        title: translation.title,
        summary: translation.summary,
        duration: translation.duration,
        location: translation.location,
      }),
      EMPTY_TRANSLATION,
    ),
    syllabus: row.modules.map((module) => ({
      id: module.id,
      translations: toTranslationMap(
        module.translations,
        (translation) => ({
          title: translation.title,
          duration: translation.duration,
          description: translation.description,
        }),
        EMPTY_MODULE_TRANSLATION,
      ),
    })),
  };
}

/** The syllabus as nested writes: each module in its place, in both languages. */
function moduleCreates(syllabus: CourseInput['syllabus']) {
  return syllabus.map((module, order) => ({
    order,
    translations: {
      create: (['KA', 'EN'] as const).map((locale) => ({
        locale,
        ...module.translations[locale],
      })),
    },
  }));
}

function translationData(translations: CourseInput['translations']) {
  return {
    KA: { ...translations.KA },
    EN: { ...translations.EN },
  };
}

export async function listAdminCourses() {
  const rows = await prisma.course.findMany({
    include: adminInclude,
    orderBy: [{ startsAt: { sort: 'asc', nulls: 'last' } }, { order: 'asc' }, { createdAt: 'asc' }],
  });
  return { items: rows.map(toAdminCourse), total: rows.length };
}

export async function getAdminCourse(id: string) {
  const row = await prisma.course.findUnique({ where: { id }, include: adminInclude });
  return row ? toAdminCourse(row) : null;
}

export async function createCourse(input: CourseInput): Promise<AdminCourse> {
  const translations = translationData(input.translations);

  const created = await prisma.course.create({
    data: {
      slug: input.slug,
      categoryId: input.categoryId,
      serviceId: input.serviceId,
      coverMediaId: input.coverMediaId ?? null,
      format: input.format,
      startsAt: input.startsAt ? fromCalendarDate(input.startsAt) : null,
      seatsTotal: input.seatsTotal ?? null,
      seatsLeft: input.seatsLeft ?? null,
      priceGel: input.priceGel ?? null,
      status: input.status,
      order: input.order,
      translations: {
        create: (['KA', 'EN'] as const).map((locale) => ({ locale, ...translations[locale] })),
      },
      modules: { create: moduleCreates(input.syllabus) },
    },
    include: adminInclude,
  });

  return toAdminCourse(created);
}

export async function updateCourse(
  id: string,
  input: CourseUpdateInput,
): Promise<AdminCourse | null> {
  const existing = await prisma.course.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;

  const updated = await prisma.course.update({
    where: { id },
    data: {
      ...(input.slug === undefined ? {} : { slug: input.slug }),
      ...(input.categoryId === undefined ? {} : { categoryId: input.categoryId }),
      ...(input.serviceId === undefined ? {} : { serviceId: input.serviceId }),
      ...(input.coverMediaId === undefined ? {} : { coverMediaId: input.coverMediaId ?? null }),
      ...(input.format === undefined ? {} : { format: input.format }),
      ...(input.startsAt === undefined
        ? {}
        : { startsAt: input.startsAt ? fromCalendarDate(input.startsAt) : null }),
      ...(input.seatsTotal === undefined ? {} : { seatsTotal: input.seatsTotal ?? null }),
      ...(input.seatsLeft === undefined ? {} : { seatsLeft: input.seatsLeft ?? null }),
      ...(input.priceGel === undefined ? {} : { priceGel: input.priceGel ?? null }),
      ...(input.status === undefined ? {} : { status: input.status }),
      ...(input.order === undefined ? {} : { order: input.order }),
      ...(input.translations
        ? {
            translations: {
              upsert: translationUpsert(
                'courseId',
                id,
                'courseId_locale',
                translationData(input.translations),
              ) as never,
            },
          }
        : {}),
      // The dashboard sends the whole list: the old one goes, the new one is
      // written in its place, in the same transaction as the rest.
      ...(input.syllabus === undefined
        ? {}
        : { modules: { deleteMany: {}, create: moduleCreates(input.syllabus) } }),
    },
    include: adminInclude,
  });

  return toAdminCourse(updated);
}

export async function deleteCourse(id: string): Promise<boolean> {
  const existing = await prisma.course.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;

  await prisma.course.delete({ where: { id } });
  return true;
}
