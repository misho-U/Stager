import {
  mediaInclude,
  toIso,
  toIsoRequired,
  toMediaSummary,
  toTranslationMap,
  translationUpsert,
} from '@/app/api/_lib/serializers';
import type {
  AdminProject,
  ProjectInput,
  ProjectUpdateInput,
  PublicProjectDetail,
  PublicProjectListItem,
} from '@/entity/project/model/project.model';
import type { DbLocale } from '@/shared/types/enums';
import { prisma } from '@pkg/db/prisma';
import { sanitizeRichText } from '@pkg/security/sanitize';

const adminInclude = {
  coverMedia: mediaInclude,
  translations: { include: { ogMedia: mediaInclude } },
  gallery: { orderBy: { order: 'asc' }, include: { media: mediaInclude } },
  services: { select: { serviceId: true } },
} as const;

const EMPTY_TRANSLATION = {
  title: '',
  summary: '',
  body: '',
  metaTitle: null,
  metaDescription: null,
  ogMediaId: null,
};

type AdminRow = Awaited<
  ReturnType<typeof prisma.project.findFirstOrThrow<{ include: typeof adminInclude }>>
>;

function toAdminProject(row: AdminRow): AdminProject {
  return {
    id: row.id,
    slug: row.slug,
    coverMediaId: row.coverMediaId,
    coverMedia: toMediaSummary(row.coverMedia),
    youtubeUrl: row.youtubeUrl,
    client: row.client,
    location: row.location,
    year: row.year,
    status: row.status,
    featured: row.featured,
    order: row.order,
    publishedAt: toIso(row.publishedAt),
    createdAt: toIsoRequired(row.createdAt),
    updatedAt: toIsoRequired(row.updatedAt),
    translations: toTranslationMap(
      row.translations,
      (translation) => ({
        title: translation.title,
        summary: translation.summary,
        body: translation.body,
        metaTitle: translation.metaTitle,
        metaDescription: translation.metaDescription,
        ogMediaId: translation.ogMediaId,
      }),
      EMPTY_TRANSLATION,
    ),
    serviceIds: row.services.map((link) => link.serviceId),
    gallery: row.gallery
      .map((item) => toMediaSummary(item.media))
      .filter((media): media is NonNullable<typeof media> => media !== null),
  };
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function listAdminProjects() {
  const rows = await prisma.project.findMany({
    include: adminInclude,
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
  });

  return { items: rows.map(toAdminProject), total: rows.length };
}

export async function getAdminProject(id: string) {
  const row = await prisma.project.findUnique({ where: { id }, include: adminInclude });
  return row ? toAdminProject(row) : null;
}

/**
 * Rich text is sanitized here, at the write boundary, so the database only ever
 * holds markup that is safe to render.
 */
function sanitizeTranslations(translations: ProjectInput['translations']) {
  return {
    KA: { ...translations.KA, body: sanitizeRichText(translations.KA.body ?? '') },
    EN: { ...translations.EN, body: sanitizeRichText(translations.EN.body ?? '') },
  };
}

/** PUBLISHED with no date set means "published now". */
function resolvePublishedAt(status: string, current: Date | null): Date | null {
  if (status !== 'PUBLISHED') return current;
  return current ?? new Date();
}

export async function createProject(input: ProjectInput): Promise<AdminProject> {
  const translations = sanitizeTranslations(input.translations);

  const created = await prisma.project.create({
    data: {
      slug: input.slug,
      coverMediaId: input.coverMediaId ?? null,
      youtubeUrl: input.youtubeUrl ?? null,
      client: input.client ?? null,
      location: input.location ?? null,
      year: input.year ?? null,
      status: input.status,
      featured: input.featured,
      order: input.order,
      publishedAt: resolvePublishedAt(input.status, null),
      translations: {
        create: (['KA', 'EN'] as const).map((locale) => ({
          locale,
          ...translations[locale],
          metaTitle: translations[locale].metaTitle ?? null,
          metaDescription: translations[locale].metaDescription ?? null,
          ogMediaId: translations[locale].ogMediaId ?? null,
        })),
      },
      services: { create: input.serviceIds.map((serviceId) => ({ serviceId })) },
      gallery: {
        create: input.galleryMediaIds.map((mediaId, index) => ({ mediaId, order: index })),
      },
    },
    include: adminInclude,
  });

  return toAdminProject(created);
}

export async function updateProject(
  id: string,
  input: ProjectUpdateInput,
): Promise<AdminProject | null> {
  const existing = await prisma.project.findUnique({
    where: { id },
    select: { id: true, status: true, publishedAt: true },
  });

  if (!existing) return null;

  const nextStatus = input.status ?? existing.status;
  const translations = input.translations ? sanitizeTranslations(input.translations) : null;

  const updated = await prisma.$transaction(async (tx) => {
    // Join tables are replaced wholesale rather than diffed: the payload is the
    // complete desired state, and a diff would silently keep rows the admin
    // removed in the form.
    if (input.serviceIds) {
      await tx.servicesOnProjects.deleteMany({ where: { projectId: id } });
      await tx.servicesOnProjects.createMany({
        data: input.serviceIds.map((serviceId) => ({ projectId: id, serviceId })),
      });
    }

    if (input.galleryMediaIds) {
      await tx.projectGalleryItem.deleteMany({ where: { projectId: id } });
      await tx.projectGalleryItem.createMany({
        data: input.galleryMediaIds.map((mediaId, index) => ({
          projectId: id,
          mediaId,
          order: index,
        })),
      });
    }

    return tx.project.update({
      where: { id },
      data: {
        ...(input.slug === undefined ? {} : { slug: input.slug }),
        ...(input.coverMediaId === undefined ? {} : { coverMediaId: input.coverMediaId ?? null }),
        ...(input.youtubeUrl === undefined ? {} : { youtubeUrl: input.youtubeUrl ?? null }),
        ...(input.client === undefined ? {} : { client: input.client ?? null }),
        ...(input.location === undefined ? {} : { location: input.location ?? null }),
        ...(input.year === undefined ? {} : { year: input.year ?? null }),
        ...(input.status === undefined ? {} : { status: input.status }),
        ...(input.featured === undefined ? {} : { featured: input.featured }),
        ...(input.order === undefined ? {} : { order: input.order }),
        publishedAt: resolvePublishedAt(nextStatus, existing.publishedAt),
        ...(translations
          ? {
              translations: {
                upsert: translationUpsert('projectId', id, 'projectId_locale', {
                  KA: {
                    ...translations.KA,
                    metaTitle: translations.KA.metaTitle ?? null,
                    metaDescription: translations.KA.metaDescription ?? null,
                    ogMediaId: translations.KA.ogMediaId ?? null,
                  },
                  EN: {
                    ...translations.EN,
                    metaTitle: translations.EN.metaTitle ?? null,
                    metaDescription: translations.EN.metaDescription ?? null,
                    ogMediaId: translations.EN.ogMediaId ?? null,
                  },
                }) as never,
              },
            }
          : {}),
      },
      include: adminInclude,
    });
  });

  return toAdminProject(updated);
}

export async function deleteProject(id: string): Promise<boolean> {
  const existing = await prisma.project.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;

  // Translations, gallery rows and service links all cascade — see the schema.
  await prisma.project.delete({ where: { id } });
  return true;
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

const publicInclude = (locale: DbLocale) =>
  ({
    coverMedia: mediaInclude,
    translations: { where: { locale }, include: { ogMedia: mediaInclude } },
    gallery: { orderBy: { order: 'asc' }, include: { media: mediaInclude } },
    services: { include: { service: { include: { translations: { where: { locale } } } } } },
  }) as const;

export async function listPublicProjects(locale: DbLocale, limit: number, offset: number) {
  const where = { status: 'PUBLISHED' as const };

  const [rows, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: publicInclude(locale),
      orderBy: [{ featured: 'desc' }, { order: 'asc' }, { publishedAt: 'desc' }],
      take: limit,
      skip: offset,
    }),
    prisma.project.count({ where }),
  ]);

  const items: PublicProjectListItem[] = rows.map((row) => {
    const translation = row.translations[0];
    return {
      id: row.id,
      slug: row.slug,
      title: translation?.title ?? '',
      summary: translation?.summary ?? '',
      cover: toMediaSummary(row.coverMedia, locale),
      year: row.year,
      location: row.location,
      client: row.client,
      featured: row.featured,
      publishedAt: toIso(row.publishedAt),
    };
  });

  return { items, total };
}

export async function getPublicProject(
  slug: string,
  locale: DbLocale,
): Promise<PublicProjectDetail | null> {
  const row = await prisma.project.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: publicInclude(locale),
  });

  if (!row) return null;

  const translation = row.translations[0];

  return {
    id: row.id,
    slug: row.slug,
    title: translation?.title ?? '',
    summary: translation?.summary ?? '',
    body: translation?.body ?? '',
    cover: toMediaSummary(row.coverMedia, locale),
    year: row.year,
    location: row.location,
    client: row.client,
    featured: row.featured,
    publishedAt: toIso(row.publishedAt),
    youtubeUrl: row.youtubeUrl,
    gallery: row.gallery
      .map((item) => toMediaSummary(item.media, locale))
      .filter((media): media is NonNullable<typeof media> => media !== null),
    metaTitle: translation?.metaTitle ?? null,
    metaDescription: translation?.metaDescription ?? null,
    ogImageUrl: translation?.ogMedia?.url ?? row.coverMedia?.url ?? null,
    services: row.services.map((link) => ({
      slug: link.service.slug,
      title: link.service.translations[0]?.title ?? '',
    })),
  };
}
