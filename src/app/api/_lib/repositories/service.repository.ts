import {
  mediaInclude,
  toIsoRequired,
  toMediaSummary,
  toTranslationMap,
  translationUpsert,
} from '@/app/api/_lib/serializers';
import type {
  AdminService,
  PublicService,
  ServiceInput,
  ServiceUpdateInput,
} from '@/entity/service/model/service.model';
import type { DbLocale } from '@/shared/types/enums';
import { prisma } from '@pkg/db/prisma';
import { sanitizeRichText } from '@pkg/security/sanitize';

const adminInclude = {
  coverMedia: mediaInclude,
  translations: { include: { ogMedia: mediaInclude } },
} as const;

const EMPTY_TRANSLATION = {
  title: '',
  shortDescription: '',
  body: '',
  metaTitle: null,
  metaDescription: null,
  ogMediaId: null,
};

type AdminRow = Awaited<
  ReturnType<typeof prisma.service.findFirstOrThrow<{ include: typeof adminInclude }>>
>;

function toAdminService(row: AdminRow): AdminService {
  return {
    id: row.id,
    slug: row.slug,
    icon: row.icon,
    coverMediaId: row.coverMediaId,
    coverMedia: toMediaSummary(row.coverMedia),
    status: row.status,
    order: row.order,
    createdAt: toIsoRequired(row.createdAt),
    updatedAt: toIsoRequired(row.updatedAt),
    translations: toTranslationMap(
      row.translations,
      (translation) => ({
        title: translation.title,
        shortDescription: translation.shortDescription,
        body: translation.body,
        metaTitle: translation.metaTitle,
        metaDescription: translation.metaDescription,
        ogMediaId: translation.ogMediaId,
      }),
      EMPTY_TRANSLATION,
    ),
  };
}

function sanitized(translations: ServiceInput['translations']) {
  return {
    KA: {
      title: translations.KA.title,
      shortDescription: translations.KA.shortDescription,
      body: sanitizeRichText(translations.KA.body ?? ''),
      metaTitle: translations.KA.metaTitle ?? null,
      metaDescription: translations.KA.metaDescription ?? null,
      ogMediaId: translations.KA.ogMediaId ?? null,
    },
    EN: {
      title: translations.EN.title,
      shortDescription: translations.EN.shortDescription,
      body: sanitizeRichText(translations.EN.body ?? ''),
      metaTitle: translations.EN.metaTitle ?? null,
      metaDescription: translations.EN.metaDescription ?? null,
      ogMediaId: translations.EN.ogMediaId ?? null,
    },
  };
}

export async function listAdminServices() {
  const rows = await prisma.service.findMany({
    include: adminInclude,
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
  return { items: rows.map(toAdminService), total: rows.length };
}

export async function getAdminService(id: string) {
  const row = await prisma.service.findUnique({ where: { id }, include: adminInclude });
  return row ? toAdminService(row) : null;
}

export async function createService(input: ServiceInput): Promise<AdminService> {
  const translations = sanitized(input.translations);

  const created = await prisma.service.create({
    data: {
      slug: input.slug,
      icon: input.icon ?? null,
      coverMediaId: input.coverMediaId ?? null,
      status: input.status,
      order: input.order,
      translations: {
        create: (['KA', 'EN'] as const).map((locale) => ({ locale, ...translations[locale] })),
      },
    },
    include: adminInclude,
  });

  return toAdminService(created);
}

export async function updateService(
  id: string,
  input: ServiceUpdateInput,
): Promise<AdminService | null> {
  const existing = await prisma.service.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;

  const translations = input.translations ? sanitized(input.translations) : null;

  const updated = await prisma.service.update({
    where: { id },
    data: {
      ...(input.slug === undefined ? {} : { slug: input.slug }),
      ...(input.icon === undefined ? {} : { icon: input.icon ?? null }),
      ...(input.coverMediaId === undefined ? {} : { coverMediaId: input.coverMediaId ?? null }),
      ...(input.status === undefined ? {} : { status: input.status }),
      ...(input.order === undefined ? {} : { order: input.order }),
      ...(translations
        ? {
            translations: {
              upsert: translationUpsert(
                'serviceId',
                id,
                'serviceId_locale',
                translations,
              ) as never,
            },
          }
        : {}),
    },
    include: adminInclude,
  });

  return toAdminService(updated);
}

export async function deleteService(id: string): Promise<boolean> {
  const existing = await prisma.service.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;

  await prisma.service.delete({ where: { id } });
  return true;
}

// --- Public ---

export async function listPublicServices(locale: DbLocale, limit: number, offset: number) {
  const where = { status: 'PUBLISHED' as const };

  const [rows, total] = await Promise.all([
    prisma.service.findMany({
      where,
      include: { coverMedia: mediaInclude, translations: { where: { locale } } },
      orderBy: { order: 'asc' },
      take: limit,
      skip: offset,
    }),
    prisma.service.count({ where }),
  ]);

  const items: PublicService[] = rows.map((row) => {
    const translation = row.translations[0];
    return {
      id: row.id,
      slug: row.slug,
      icon: row.icon,
      title: translation?.title ?? '',
      shortDescription: translation?.shortDescription ?? '',
      body: translation?.body ?? '',
      cover: toMediaSummary(row.coverMedia, locale),
      metaTitle: translation?.metaTitle ?? null,
      metaDescription: translation?.metaDescription ?? null,
    };
  });

  return { items, total };
}

export async function getPublicService(
  slug: string,
  locale: DbLocale,
): Promise<PublicService | null> {
  const row = await prisma.service.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: { coverMedia: mediaInclude, translations: { where: { locale } } },
  });

  if (!row) return null;

  const translation = row.translations[0];

  return {
    id: row.id,
    slug: row.slug,
    icon: row.icon,
    title: translation?.title ?? '',
    shortDescription: translation?.shortDescription ?? '',
    body: translation?.body ?? '',
    cover: toMediaSummary(row.coverMedia, locale),
    metaTitle: translation?.metaTitle ?? null,
    metaDescription: translation?.metaDescription ?? null,
  };
}
