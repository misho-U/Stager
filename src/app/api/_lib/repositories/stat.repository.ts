import { toIsoRequired, toTranslationMap, translationUpsert } from '@/app/api/_lib/serializers';
import type {
  AdminStat,
  PublicStat,
  StatInput,
  StatUpdateInput,
} from '@/entity/stat/model/stat.model';
import type { DbLocale } from '@/shared/types/enums';
import { prisma } from '@pkg/db/prisma';

const adminInclude = { translations: true } as const;

type AdminRow = Awaited<
  ReturnType<typeof prisma.stat.findFirstOrThrow<{ include: typeof adminInclude }>>
>;

const ORDER = [{ order: 'asc' as const }, { createdAt: 'asc' as const }];

function toAdminStat(row: AdminRow): AdminStat {
  return {
    id: row.id,
    value: row.value,
    order: row.order,
    isActive: row.isActive,
    createdAt: toIsoRequired(row.createdAt),
    updatedAt: toIsoRequired(row.updatedAt),
    translations: toTranslationMap(
      row.translations,
      (translation) => ({ label: translation.label }),
      { label: '' },
    ),
  };
}

export async function listAdminStats() {
  const rows = await prisma.stat.findMany({ include: adminInclude, orderBy: ORDER });
  return { items: rows.map(toAdminStat), total: rows.length };
}

export async function getAdminStat(id: string) {
  const row = await prisma.stat.findUnique({ where: { id }, include: adminInclude });
  return row ? toAdminStat(row) : null;
}

/** The figures shown on the site: switched on, in the dashboard's order. */
export async function listPublicStats(locale: DbLocale) {
  const rows = await prisma.stat.findMany({
    where: { isActive: true },
    include: { translations: { where: { locale } } },
    orderBy: ORDER,
  });

  const items: PublicStat[] = rows.map((row) => ({
    id: row.id,
    value: row.value,
    label: row.translations[0]?.label ?? '',
  }));

  return { items, total: items.length };
}

export async function createStat(input: StatInput): Promise<AdminStat> {
  const created = await prisma.stat.create({
    data: {
      value: input.value,
      order: input.order,
      isActive: input.isActive,
      translations: {
        create: (['KA', 'EN'] as const).map((locale) => ({
          locale,
          label: input.translations[locale].label,
        })),
      },
    },
    include: adminInclude,
  });

  return toAdminStat(created);
}

export async function updateStat(id: string, input: StatUpdateInput): Promise<AdminStat | null> {
  const existing = await prisma.stat.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;

  const updated = await prisma.stat.update({
    where: { id },
    data: {
      ...(input.value === undefined ? {} : { value: input.value }),
      ...(input.order === undefined ? {} : { order: input.order }),
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      ...(input.translations
        ? {
            translations: {
              upsert: translationUpsert('statId', id, 'statId_locale', input.translations) as never,
            },
          }
        : {}),
    },
    include: adminInclude,
  });

  return toAdminStat(updated);
}

export async function deleteStat(id: string): Promise<boolean> {
  const existing = await prisma.stat.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;

  await prisma.stat.delete({ where: { id } });
  return true;
}
