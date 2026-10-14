import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import type { PublicCategory } from '@/entity/category/model/category.model';
import type { DbLocale } from '@/shared/types/enums';
import { collectionTag, CONTENT_CACHE_LIFE } from '@pkg/cache/tags';
import { prisma } from '@pkg/db/prisma';

export async function listPublicCategories(locale: DbLocale) {
  'use cache';
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(collectionTag('category'));

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
