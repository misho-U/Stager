import {
  mediaInclude,
  toMediaSummary,
  toTranslationMap,
  translationUpsert,
} from '@/app/api/_lib/serializers';
import type {
  AdminPage,
  PageUpdateInput,
  PublicPage,
} from '@/entity/page/model/page.model';
import type { DbLocale, PageKey } from '@/shared/types/enums';
import { prisma } from '@pkg/db/prisma';
import { sanitizeRichText } from '@pkg/security/sanitize';

const adminInclude = {
  translations: { include: { ogMedia: mediaInclude } },
  sections: {
    orderBy: { order: 'asc' },
    include: { media: mediaInclude, translations: true },
  },
} as const;

const EMPTY_PAGE_TRANSLATION = {
  title: '',
  metaTitle: null,
  metaDescription: null,
  ogMediaId: null,
};

const EMPTY_SECTION_TRANSLATION = {
  heading: '',
  subheading: '',
  body: '',
  ctaLabel: '',
  ctaHref: '',
};

type AdminRow = Awaited<
  ReturnType<typeof prisma.page.findFirstOrThrow<{ include: typeof adminInclude }>>
>;

function toAdminPage(row: AdminRow): AdminPage {
  return {
    id: row.id,
    key: row.key,
    translations: toTranslationMap(
      row.translations,
      (translation) => ({
        title: translation.title,
        metaTitle: translation.metaTitle,
        metaDescription: translation.metaDescription,
        ogMediaId: translation.ogMediaId,
      }),
      EMPTY_PAGE_TRANSLATION,
    ),
    sections: row.sections.map((section) => ({
      id: section.id,
      key: section.key,
      order: section.order,
      isVisible: section.isVisible,
      mediaId: section.mediaId,
      media: toMediaSummary(section.media),
      translations: toTranslationMap(
        section.translations,
        (translation) => ({
          heading: translation.heading,
          subheading: translation.subheading,
          body: translation.body,
          ctaLabel: translation.ctaLabel,
          ctaHref: translation.ctaHref,
        }),
        EMPTY_SECTION_TRANSLATION,
      ),
    })),
  };
}

export async function listAdminPages() {
  const rows = await prisma.page.findMany({ include: adminInclude, orderBy: { key: 'asc' } });
  return { items: rows.map(toAdminPage), total: rows.length };
}

export async function getAdminPage(key: PageKey) {
  const row = await prisma.page.findUnique({ where: { key }, include: adminInclude });
  return row ? toAdminPage(row) : null;
}

/**
 * Update a page's SEO fields and the copy of its sections.
 *
 * Sections themselves are never created or deleted here: their keys are
 * referenced by the frontend, so the set of sections is a code concern. The
 * admin edits what a section says, not whether it exists.
 */
export async function updateAdminPage(
  key: PageKey,
  input: PageUpdateInput,
): Promise<AdminPage | null> {
  const page = await prisma.page.findUnique({
    where: { key },
    select: { id: true, sections: { select: { id: true } } },
  });

  if (!page) return null;

  const ownedSectionIds = new Set(page.sections.map((section) => section.id));

  await prisma.$transaction(async (tx) => {
    if (input.translations) {
      await tx.page.update({
        where: { id: page.id },
        data: {
          translations: {
            upsert: translationUpsert('pageId', page.id, 'pageId_locale', {
              KA: {
                title: input.translations.KA.title,
                metaTitle: input.translations.KA.metaTitle ?? null,
                metaDescription: input.translations.KA.metaDescription ?? null,
                ogMediaId: input.translations.KA.ogMediaId ?? null,
              },
              EN: {
                title: input.translations.EN.title,
                metaTitle: input.translations.EN.metaTitle ?? null,
                metaDescription: input.translations.EN.metaDescription ?? null,
                ogMediaId: input.translations.EN.ogMediaId ?? null,
              },
            }) as never,
          },
        },
      });
    }

    for (const section of input.sections ?? []) {
      // A section id from another page would let one page's editor rewrite
      // another's copy. Ignore anything not belonging to this page.
      if (!ownedSectionIds.has(section.id)) continue;

      await tx.pageSection.update({
        where: { id: section.id },
        data: {
          ...(section.isVisible === undefined ? {} : { isVisible: section.isVisible }),
          ...(section.mediaId === undefined ? {} : { mediaId: section.mediaId ?? null }),
          translations: {
            upsert: translationUpsert('sectionId', section.id, 'sectionId_locale', {
              KA: {
                ...section.translations.KA,
                body: sanitizeRichText(section.translations.KA.body ?? ''),
              },
              EN: {
                ...section.translations.EN,
                body: sanitizeRichText(section.translations.EN.body ?? ''),
              },
            }) as never,
          },
        },
      });
    }
  });

  return getAdminPage(key);
}

// --- Public ---

export async function getPublicPage(key: PageKey, locale: DbLocale): Promise<PublicPage | null> {
  const row = await prisma.page.findUnique({
    where: { key },
    include: {
      translations: { where: { locale }, include: { ogMedia: mediaInclude } },
      sections: {
        where: { isVisible: true },
        orderBy: { order: 'asc' },
        include: { media: mediaInclude, translations: { where: { locale } } },
      },
    },
  });

  if (!row) return null;

  const translation = row.translations[0];

  return {
    key: row.key,
    title: translation?.title ?? '',
    metaTitle: translation?.metaTitle ?? null,
    metaDescription: translation?.metaDescription ?? null,
    ogImageUrl: translation?.ogMedia?.url ?? null,
    sections: row.sections.map((section) => {
      const sectionTranslation = section.translations[0];
      return {
        key: section.key,
        heading: sectionTranslation?.heading ?? '',
        subheading: sectionTranslation?.subheading ?? '',
        body: sectionTranslation?.body ?? '',
        ctaLabel: sectionTranslation?.ctaLabel ?? '',
        ctaHref: sectionTranslation?.ctaHref ?? '',
        media: toMediaSummary(section.media, locale),
      };
    }),
  };
}
