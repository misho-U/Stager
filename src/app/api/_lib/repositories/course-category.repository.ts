import { toIsoRequired, toTranslationMap, translationUpsert } from '@/app/api/_lib/serializers';
import type {
  AdminCourseCategory,
  CourseCategoryInput,
  CourseCategoryUpdateInput,
} from '@/entity/course-category/model/course-category.model';
import { prisma } from '@pkg/db/prisma';

const adminInclude = { translations: true } as const;

type AdminRow = Awaited<
  ReturnType<typeof prisma.courseCategory.findFirstOrThrow<{ include: typeof adminInclude }>>
>;

function toAdminCourseCategory(row: AdminRow): AdminCourseCategory {
  return {
    id: row.id,
    slug: row.slug,
    order: row.order,
    createdAt: toIsoRequired(row.createdAt),
    updatedAt: toIsoRequired(row.updatedAt),
    translations: toTranslationMap(
      row.translations,
      (translation) => ({ name: translation.name }),
      { name: '' },
    ),
  };
}

export async function listAdminCourseCategories() {
  const rows = await prisma.courseCategory.findMany({
    include: adminInclude,
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
  return { items: rows.map(toAdminCourseCategory), total: rows.length };
}

export async function getAdminCourseCategory(id: string) {
  const row = await prisma.courseCategory.findUnique({ where: { id }, include: adminInclude });
  return row ? toAdminCourseCategory(row) : null;
}

export async function createCourseCategory(
  input: CourseCategoryInput,
): Promise<AdminCourseCategory> {
  const created = await prisma.courseCategory.create({
    data: {
      slug: input.slug,
      order: input.order,
      translations: {
        create: (['KA', 'EN'] as const).map((locale) => ({
          locale,
          name: input.translations[locale].name,
        })),
      },
    },
    include: adminInclude,
  });

  return toAdminCourseCategory(created);
}

export async function updateCourseCategory(
  id: string,
  input: CourseCategoryUpdateInput,
): Promise<AdminCourseCategory | null> {
  const existing = await prisma.courseCategory.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;

  const updated = await prisma.courseCategory.update({
    where: { id },
    data: {
      ...(input.slug === undefined ? {} : { slug: input.slug }),
      ...(input.order === undefined ? {} : { order: input.order }),
      ...(input.translations
        ? {
            translations: {
              upsert: translationUpsert(
                'categoryId',
                id,
                'categoryId_locale',
                input.translations,
              ) as never,
            },
          }
        : {}),
    },
    include: adminInclude,
  });

  return toAdminCourseCategory(updated);
}

export async function deleteCourseCategory(id: string): Promise<boolean> {
  const existing = await prisma.courseCategory.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;

  // Its courses survive without a category: deleting a filter must never
  // delete what is filed under it.
  await prisma.courseCategory.delete({ where: { id } });
  return true;
}
