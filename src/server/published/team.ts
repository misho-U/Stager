import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import type { PublicTeamMember } from '@/entity/team-member/model/team-member.model';
import type { DbLocale } from '@/shared/types/enums';
import { collectionTag, CONTENT_CACHE_LIFE } from '@pkg/cache/tags';
import { prisma } from '@pkg/db/prisma';
import { mediaInclude, toMediaSummary } from '@/server/published/serializers';

export async function listPublicTeamMembers(locale: DbLocale, limit: number, offset: number) {
  'use cache';
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(collectionTag('teamMember'));

  const where = { status: 'PUBLISHED' as const };

  const [rows, total] = await Promise.all([
    prisma.teamMember.findMany({
      where,
      include: { photoMedia: mediaInclude, translations: { where: { locale } } },
      orderBy: { order: 'asc' },
      take: limit,
      skip: offset,
    }),
    prisma.teamMember.count({ where }),
  ]);

  const items: PublicTeamMember[] = rows.map((row) => {
    const translation = row.translations[0];
    return {
      id: row.id,
      slug: row.slug,
      name: translation?.name ?? '',
      position: translation?.position ?? '',
      bio: translation?.bio ?? '',
      expertise: translation?.expertise ?? '',
      photo: toMediaSummary(row.photoMedia, locale),
      linkedinUrl: row.linkedinUrl,
    };
  });

  return { items, total };
}
