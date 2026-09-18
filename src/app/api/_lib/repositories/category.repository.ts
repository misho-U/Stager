import { toIsoRequired, toTranslationMap, translationUpsert } from '@/app/api/_lib/serializers';
import type {
  AdminCategory,
  CategoryInput,
  CategoryUpdateInput,
  PublicCategory,
} from '@/entity/category/model/category.model';
import type { DbLocale } from '@/shared/types/enums';
import { prisma } from '@pkg/db/prisma';

const adminInclude = { translations: true } as const;

type AdminRow = Awaited<
  ReturnType<typeof prisma.category.findFirstOrThrow<{ include: typeof adminInclude }>>
>;

function toAdminCategory(row: AdminRow): AdminCategory {
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

export async function listAdminCategories() {
  const rows = await prisma.category.findMany({
    include: adminInclude,
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
  return { items: rows.map(toAdminCategory), total: rows.length };
}

export async function getAdminCategory(id: string) {
  const row = await prisma.category.findUnique({ where: { id }, include: adminInclude });
  return row ? toAdminCategory(row) : null;
}

export async function createCategory(input: CategoryInput): Promise<AdminCategory> {
  const created = await prisma.category.create({
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

  return toAdminCategory(created);
}

export async function updateCategory(
  id: string,
  input: CategoryUpdateInput,
): Promise<AdminCategory | null> {
  const existing = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;

  const updated = await prisma.category.update({
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

  return toAdminCategory(updated);
}

export async function deleteCategory(id: string): Promise<boolean> {
  const existing = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;

  // Articles in this category survive with categoryId nulled — deleting a
  // taxonomy entry must never delete the writing filed under it.
  await prisma.category.delete({ where: { id } });
  return true;
}

// --- Public ---

export async function listPublicCategories(locale: DbLocale) {
  const rows = await prisma.category.findMany({
    include: { translations: { where: { locale } } },
    orderBy: { order: 'asc' },
  });

  const items: PublicCategory[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.translations[0]?.name ?? '',
  }));

  return { items, total: items.length };
}
