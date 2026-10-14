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
} from '@/entity/insight/model/insight.model';
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

/**
 * The list leaves the bodies out: they are the long part, in both languages,
 * and a list of them all would in time pass Vercel's 4.5 MB response limit.
 * Nothing on the list shows them; the edit form loads its record whole.
 */
export async function listAdminInsights() {
  const rows = await prisma.insight.findMany({
    include: {
      ...adminInclude,
      translations: { include: { ogMedia: mediaInclude }, omit: { body: true } },
    },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
  });
  return {
    items: rows.map((row) =>
      toAdminInsight({
        ...row,
        translations: row.translations.map((translation) => ({ ...translation, body: '' })),
      }),
    ),
    total: rows.length,
  };
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
              upsert: translationUpsert('insightId', id, 'insightId_locale', translations) as never,
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
