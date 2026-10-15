import {
  mediaInclude,
  toMediaSummary,
  toTranslationMap,
  translationUpsert,
} from '@/app/api/_lib/serializers';
import { isSitePage, type AdminPage, type PageUpdateInput } from '@/entity/page/model/page.model';
import type { PageKey } from '@/shared/types/enums';
import { isUnknownEnumValue } from '@pkg/db/errors';
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

/**
 * The pages the dashboard offers: those the site renders. The rest stay in
 * the database, unused (see SITE_PAGE_KEYS).
 */
/**
 * A lookup by page key that treats a key the database's enum does not hold
 * yet as no page (see isUnknownEnumValue): a preview of a new page, running
 * against the live database before its migration, finds nothing rather than
 * failing every page that asks.
 */
async function byKey<T>(lookup: () => Promise<T | null>): Promise<T | null> {
  try {
    return await lookup();
  } catch (error) {
    if (isUnknownEnumValue(error)) return null;
    throw error;
  }
}

export async function listAdminPages() {
  // Filtered here, not in the query: a key in the filter that the database
  // does not hold yet would fail the whole list.
  const rows = await prisma.page.findMany({ include: adminInclude, orderBy: { key: 'asc' } });
  const shown = rows.filter((row) => isSitePage(row.key));
  return { items: shown.map(toAdminPage), total: shown.length };
}

export async function getAdminPage(key: PageKey) {
  const row = await byKey(() => prisma.page.findUnique({ where: { key }, include: adminInclude }));
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
  const page = await byKey(() =>
    prisma.page.findUnique({
      where: { key },
      select: { id: true, sections: { select: { id: true } } },
    }),
  );

  if (!page) return null;

  const ownedSectionIds = new Set(page.sections.map((section) => section.id));

  await prisma.$transaction(
    async (tx) => {
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
      // The writes run one after another, a round trip each. Prisma's 5 s
      // default left too little room for a page with many sections when the
      // function and the database are far apart.
    },
    { timeout: 15_000 },
  );

  return getAdminPage(key);
}
