import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import type { PublicStat } from '@/entity/stat/model/stat.model';
import type { DbLocale } from '@/shared/types/enums';
import { collectionTag, CONTENT_CACHE_LIFE } from '@pkg/cache/tags';
import { prisma } from '@pkg/db/prisma';

const ORDER = [{ order: 'asc' as const }, { createdAt: 'asc' as const }];

/** The figures shown on the site: switched on, in the dashboard's order. */
export async function listPublicStats(locale: DbLocale) {
  'use cache';
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(collectionTag('stat'));

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
