import { mediaInclude, toMediaSummary, toTranslationMap } from '@/app/api/_lib/serializers';
import { listPublicSocialLinks } from '@/app/api/_lib/repositories/social-link.repository';
import type {
  AdminSiteSetting,
  PublicLayoutData,
  SiteSettingUpdateInput,
} from '@/entity/site-setting/model/site-setting.model';
import type { DbLocale } from '@/shared/types/enums';
import { prisma } from '@pkg/db/prisma';

const SINGLETON_ID = 'singleton';

const include = {
  logoMedia: mediaInclude,
  logoLightMedia: mediaInclude,
  translations: { include: { ogMedia: mediaInclude } },
} as const;

const EMPTY_TRANSLATION = {
  siteName: 'STAGER',
  tagline: '',
  address: '',
  footerText: '',
  metaTitle: null,
  metaDescription: null,
  ogMediaId: null,
};

type Row = Awaited<
  ReturnType<typeof prisma.siteSetting.findFirstOrThrow<{ include: typeof include }>>
>;

function toAdminSiteSetting(row: Row): AdminSiteSetting {
  return {
    id: row.id,
    logoMediaId: row.logoMediaId,
    logoMedia: toMediaSummary(row.logoMedia),
    logoLightMediaId: row.logoLightMediaId,
    logoLightMedia: toMediaSummary(row.logoLightMedia),
    contactEmail: row.contactEmail,
    phone: row.phone,
    inquiryInboxEmail: row.inquiryInboxEmail,
    translations: toTranslationMap(
      row.translations,
      (translation) => ({
        siteName: translation.siteName,
        tagline: translation.tagline,
        address: translation.address,
        footerText: translation.footerText,
        metaTitle: translation.metaTitle,
        metaDescription: translation.metaDescription,
        ogMediaId: translation.ogMediaId,
      }),
      EMPTY_TRANSLATION,
    ),
  };
}

/**
 * Read the singleton, creating it if it is missing.
 *
 * The seed creates it, but the settings screen must not 500 on a database that
 * was migrated without seeding.
 */
async function ensureRow() {
  const existing = await prisma.siteSetting.findUnique({ where: { id: SINGLETON_ID }, include });
  if (existing) return existing;

  await prisma.siteSetting.create({ data: { id: SINGLETON_ID } });
  return prisma.siteSetting.findUniqueOrThrow({ where: { id: SINGLETON_ID }, include });
}

export async function getSiteSettings(): Promise<AdminSiteSetting> {
  return toAdminSiteSetting(await ensureRow());
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  return value.trim() === '' ? null : value;
}

export async function updateSiteSettings(
  input: SiteSettingUpdateInput,
): Promise<AdminSiteSetting> {
  await ensureRow();

  await prisma.siteSetting.update({
    where: { id: SINGLETON_ID },
    data: {
      ...(input.logoMediaId === undefined ? {} : { logoMediaId: input.logoMediaId ?? null }),
      ...(input.logoLightMediaId === undefined
        ? {}
        : { logoLightMediaId: input.logoLightMediaId ?? null }),
      ...(input.contactEmail === undefined
        ? {}
        : { contactEmail: emptyToNull(input.contactEmail) }),
      ...(input.phone === undefined ? {} : { phone: emptyToNull(input.phone) }),
      ...(input.inquiryInboxEmail === undefined
        ? {}
        : { inquiryInboxEmail: emptyToNull(input.inquiryInboxEmail) }),
      ...(input.translations
        ? {
            translations: {
              upsert: (['KA', 'EN'] as const).map((locale) => {
                const translation = input.translations![locale];
                const data = {
                  siteName: translation.siteName,
                  tagline: translation.tagline,
                  address: translation.address,
                  footerText: translation.footerText,
                  metaTitle: translation.metaTitle ?? null,
                  metaDescription: translation.metaDescription ?? null,
                  ogMediaId: translation.ogMediaId ?? null,
                };
                return {
                  where: { siteSettingId_locale: { siteSettingId: SINGLETON_ID, locale } },
                  create: { locale, ...data },
                  update: data,
                };
              }) as never,
            },
          }
        : {}),
    },
  });

  return getSiteSettings();
}

/** Inbox for contact-form notifications: the admin's override, else the env default. */
export async function getInquiryInbox(): Promise<string | null> {
  const row = await prisma.siteSetting.findUnique({
    where: { id: SINGLETON_ID },
    select: { inquiryInboxEmail: true },
  });

  return row?.inquiryInboxEmail ?? null;
}

// --- Public ---

/** Everything the header and footer need, in one cached read. */
export async function getPublicLayoutData(locale: DbLocale): Promise<PublicLayoutData> {
  const [row, socialLinks] = await Promise.all([
    prisma.siteSetting.findUnique({
      where: { id: SINGLETON_ID },
      include: {
        logoMedia: mediaInclude,
        logoLightMedia: mediaInclude,
        translations: { where: { locale } },
      },
    }),
    listPublicSocialLinks(),
  ]);

  const translation = row?.translations[0];

  return {
    siteName: translation?.siteName ?? 'STAGER',
    tagline: translation?.tagline ?? '',
    footerText: translation?.footerText ?? '',
    address: translation?.address ?? '',
    contactEmail: row?.contactEmail ?? null,
    phone: row?.phone ?? null,
    logo: toMediaSummary(row?.logoMedia, locale),
    logoLight: toMediaSummary(row?.logoLightMedia, locale),
    metaTitle: translation?.metaTitle ?? null,
    metaDescription: translation?.metaDescription ?? null,
    socialLinks,
  };
}
