import {
  mediaInclude,
  toIso,
  toIsoRequired,
  toMediaSummary,
  toTranslationMap,
  translationUpsert,
} from '@/app/api/_lib/serializers';
import type {
  AdminInsight,
  InsightInput,
  InsightUpdateInput,
  PublicInsightDetail,
  PublicInsightListItem,
} from '@/entity/insight/model/insight.model';
import type { DbLocale } from '@/shared/types/enums';
import { prisma } from '@pkg/db/prisma';
import { sanitizeRichText } from '@pkg/security/sanitize';

const adminInclude = {
  coverMedia: mediaInclude,
  translations: { include: { ogMedia: mediaInclude } },
} as const;

const EMPTY_TRANSLATION = {
  title: '',
  excerpt: '',
  body: '',
  metaTitle: null,
  metaDescription: null,
  ogMediaId: null,
};

type AdminRow = Awaited<
  ReturnType<typeof prisma.insight.findFirstOrThrow<{ include: typeof adminInclude }>>
>;

function toAdminInsight(row: AdminRow): AdminInsight {
  return {
    id: row.id,
    slug: row.slug,
    coverMediaId: row.coverMediaId,
    coverMedia: toMediaSummary(row.coverMedia),
    categoryId: row.categoryId,
    authorId: row.authorId,
    showAuthor: row.showAuthor,
    readingMinutes: row.readingMinutes,
    status: row.status,
    publishedAt: toIso(row.publishedAt),
    createdAt: toIsoRequired(row.createdAt),
    updatedAt: toIsoRequired(row.updatedAt),
    translations: toTranslationMap(
      row.translations,
      (translation) => ({
        title: translation.title,
        excerpt: translation.excerpt,
        body: translation.body,
        metaTitle: translation.metaTitle,
        metaDescription: translation.metaDescription,
        ogMediaId: translation.ogMediaId,
      }),
      EMPTY_TRANSLATION,
    ),
  };
}

function sanitized(translations: InsightInput['translations']) {
  return {
    KA: {
      title: translations.KA.title,
      excerpt: translations.KA.excerpt,
      body: sanitizeRichText(translations.KA.body ?? ''),
      metaTitle: translations.KA.metaTitle ?? null,
      metaDescription: translations.KA.metaDescription ?? null,
      ogMediaId: translations.KA.ogMediaId ?? null,
    },
    EN: {
      title: translations.EN.title,
      excerpt: translations.EN.excerpt,
      body: sanitizeRichText(translations.EN.body ?? ''),
      metaTitle: translations.EN.metaTitle ?? null,
      metaDescription: translations.EN.metaDescription ?? null,
      ogMediaId: translations.EN.ogMediaId ?? null,
    },
  };
}

function resolvePublishedAt(
  status: string,
  explicit: string | null | undefined,
  current: Date | null,
): Date | null {
  if (explicit) return new Date(explicit);
  if (status !== 'PUBLISHED') return current;
  return current ?? new Date();
}

export async function listAdminInsights() {
  const rows = await prisma.insight.findMany({
    include: adminInclude,
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
  });
  return { items: rows.map(toAdminInsight), total: rows.length };
}

export async function getAdminInsight(id: string) {
  const row = await prisma.insight.findUnique({ where: { id }, include: adminInclude });
  return row ? toAdminInsight(row) : null;
}

export async function createInsight(input: InsightInput): Promise<AdminInsight> {
  const translations = sanitized(input.translations);

  const created = await prisma.insight.create({
    data: {
      slug: input.slug,
      coverMediaId: input.coverMediaId ?? null,
      categoryId: input.categoryId ?? null,
      authorId: input.authorId ?? null,
      showAuthor: input.showAuthor,
      readingMinutes: input.readingMinutes ?? null,
      status: input.status,
      publishedAt: resolvePublishedAt(input.status, input.publishedAt, null),
      translations: {
        create: (['KA', 'EN'] as const).map((locale) => ({ locale, ...translations[locale] })),
      },
    },
    include: adminInclude,
  });

  return toAdminInsight(created);
}

export async function updateInsight(
  id: string,
  input: InsightUpdateInput,
): Promise<AdminInsight | null> {
  const existing = await prisma.insight.findUnique({
    where: { id },
    select: { id: true, status: true, publishedAt: true },
  });
  if (!existing) return null;

  const nextStatus = input.status ?? existing.status;
  const translations = input.translations ? sanitized(input.translations) : null;

  const updated = await prisma.insight.update({
    where: { id },
    data: {
      ...(input.slug === undefined ? {} : { slug: input.slug }),
      ...(input.coverMediaId === undefined ? {} : { coverMediaId: input.coverMediaId ?? null }),
      ...(input.categoryId === undefined ? {} : { categoryId: input.categoryId ?? null }),
      ...(input.authorId === undefined ? {} : { authorId: input.authorId ?? null }),
      ...(input.showAuthor === undefined ? {} : { showAuthor: input.showAuthor }),
      ...(input.readingMinutes === undefined
        ? {}
        : { readingMinutes: input.readingMinutes ?? null }),
      ...(input.status === undefined ? {} : { status: input.status }),
      publishedAt: resolvePublishedAt(nextStatus, input.publishedAt, existing.publishedAt),
      ...(translations
        ? {
            translations: {
              upsert: translationUpsert(
                'insightId',
                id,
                'insightId_locale',
                translations,
              ) as never,
            },
          }
        : {}),
    },
    include: adminInclude,
  });

  return toAdminInsight(updated);
}

export async function deleteInsight(id: string): Promise<boolean> {
  const existing = await prisma.insight.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;

  await prisma.insight.delete({ where: { id } });
  return true;
}

// --- Public ---

const publicInclude = (locale: DbLocale) =>
  ({
    coverMedia: mediaInclude,
    translations: { where: { locale }, include: { ogMedia: mediaInclude } },
    category: { include: { translations: { where: { locale } } } },
    author: { include: { translations: { where: { locale } } } },
  }) as const;

type PublicRow = {
  id: string;
  slug: string;
  showAuthor: boolean;
  readingMinutes: number | null;
  publishedAt: Date | null;
  coverMedia: Parameters<typeof toMediaSummary>[0];
  translations: Array<{
    title: string;
    excerpt: string;
    body: string;
    metaTitle: string | null;
    metaDescription: string | null;
    ogMedia: { url: string } | null;
  }>;
  category: { slug: string; translations: Array<{ name: string }> } | null;
  author: { slug: string; translations: Array<{ name: string }> } | null;
};

function toPublicListItem(row: PublicRow, locale: DbLocale): PublicInsightListItem {
  const translation = row.translations[0];

  return {
    id: row.id,
    slug: row.slug,
    title: translation?.title ?? '',
    excerpt: translation?.excerpt ?? '',
    cover: toMediaSummary(row.coverMedia, locale),
    category: row.category
      ? { slug: row.category.slug, name: row.category.translations[0]?.name ?? '' }
      : null,
    // showAuthor === false means the article is published anonymously, so the
    // author must not leak through the API either — not just be hidden in the UI.
    author:
      row.showAuthor && row.author
        ? { slug: row.author.slug, name: row.author.translations[0]?.name ?? '' }
        : null,
    readingMinutes: row.readingMinutes,
    publishedAt: toIso(row.publishedAt),
  };
}

export async function listPublicInsights(
  locale: DbLocale,
  limit: number,
  offset: number,
  categorySlug?: string,
) {
  const where = {
    status: 'PUBLISHED' as const,
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.insight.findMany({
      where,
      include: publicInclude(locale),
      orderBy: [{ publishedAt: 'desc' }],
      take: limit,
      skip: offset,
    }),
    prisma.insight.count({ where }),
  ]);

  return { items: rows.map((row) => toPublicListItem(row as PublicRow, locale)), total };
}

export async function getPublicInsight(
  slug: string,
  locale: DbLocale,
): Promise<PublicInsightDetail | null> {
  const row = await prisma.insight.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: publicInclude(locale),
  });

  if (!row) return null;

  const typed = row as PublicRow;
  const translation = typed.translations[0];

  return {
    ...toPublicListItem(typed, locale),
    body: translation?.body ?? '',
    metaTitle: translation?.metaTitle ?? null,
    metaDescription: translation?.metaDescription ?? null,
    ogImageUrl: translation?.ogMedia?.url ?? row.coverMedia?.url ?? null,
  };
}
