import { toIsoRequired, toTranslationMap } from '@/app/api/_lib/serializers';
import type {
  Media,
  MediaRegisterInput,
  MediaUpdateInput,
} from '@/entity/media/model/media.model';
import { prisma } from '@pkg/db/prisma';
import { sanitizePlainText } from '@pkg/security/sanitize';

const include = { translations: true } as const;

type Row = Awaited<
  ReturnType<typeof prisma.media.findFirstOrThrow<{ include: typeof include }>>
>;

function toMedia(row: Row): Media {
  return {
    id: row.id,
    url: row.url,
    pathname: row.pathname,
    contentType: row.contentType,
    size: row.size,
    width: row.width,
    height: row.height,
    blurDataUrl: row.blurDataUrl,
    createdAt: toIsoRequired(row.createdAt),
    translations: toTranslationMap(
      row.translations,
      (translation) => ({ alt: translation.alt, caption: translation.caption }),
      { alt: '', caption: '' },
    ),
  };
}

export async function listMedia() {
  const rows = await prisma.media.findMany({ include, orderBy: { createdAt: 'desc' } });
  return { items: rows.map(toMedia), total: rows.length };
}

export async function getMedia(id: string) {
  const row = await prisma.media.findUnique({ where: { id }, include });
  return row ? toMedia(row) : null;
}

/**
 * Record a blob that has already been uploaded.
 *
 * Alt text is stripped of markup: it lands in an `alt` attribute, and an
 * unescaped quote there is an HTML injection.
 */
export async function registerMedia(
  input: MediaRegisterInput,
  uploadedById: string,
): Promise<Media> {
  const alt = sanitizePlainText(input.alt ?? '');

  const created = await prisma.media.create({
    data: {
      url: input.url,
      pathname: input.pathname,
      contentType: input.contentType,
      size: input.size,
      width: input.width ?? null,
      height: input.height ?? null,
      blurDataUrl: input.blurDataUrl ?? null,
      uploadedById,
      translations: {
        create: (['KA', 'EN'] as const).map((locale) => ({ locale, alt, caption: '' })),
      },
    },
    include,
  });

  return toMedia(created);
}

export async function updateMedia(id: string, input: MediaUpdateInput): Promise<Media | null> {
  const existing = await prisma.media.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;

  const updated = await prisma.media.update({
    where: { id },
    data: {
      translations: {
        upsert: (['KA', 'EN'] as const).map((locale) => {
          const data = {
            alt: sanitizePlainText(input.translations[locale].alt),
            caption: sanitizePlainText(input.translations[locale].caption ?? ''),
          };
          return {
            where: { mediaId_locale: { mediaId: id, locale } },
            create: { locale, ...data },
            update: data,
          };
        }),
      },
    },
    include,
  });

  return toMedia(updated);
}

/**
 * Delete a media record, reporting whether anything still references it.
 *
 * Returns the blob URL so the caller can clean up the object afterwards — the
 * database row is the source of truth, and an orphaned blob is a far smaller
 * problem than a row pointing at a file that no longer exists.
 */
export async function deleteMedia(
  id: string,
): Promise<{ deleted: boolean; url: string | null; inUse: boolean }> {
  const row = await prisma.media.findUnique({
    where: { id },
    select: {
      id: true,
      url: true,
      _count: {
        select: {
          projectCovers: true,
          projectGalleryItems: true,
          serviceCovers: true,
          teamMemberPhotos: true,
          insightCovers: true,
          pageSectionMedia: true,
          siteSettingLogos: true,
          siteSettingLogosLight: true,
        },
      },
    },
  });

  if (!row) return { deleted: false, url: null, inUse: false };

  const references = Object.values(row._count).reduce((total, count) => total + count, 0);

  if (references > 0) {
    // Refusing beats a silent SetNull: an admin who deletes an image should be
    // told which content would lose it, not discover the gap later.
    return { deleted: false, url: row.url, inUse: true };
  }

  await prisma.media.delete({ where: { id } });
  return { deleted: true, url: row.url, inUse: false };
}
