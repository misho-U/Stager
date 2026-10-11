import { getTranslations } from 'next-intl/server';

import { privacyPolicy } from '@/entity/page/model/page.model';
import { loadPrivacyPageData } from '@/modules/privacy-page/privacy-page.service';
import { PendingSlot } from '@/shared/components/pending-slot';
import { ReadFailureNotice } from '@/shared/components/read-failure-notice';
import { RichText } from '@/shared/components/rich-text';
import { CONTENT_ID, SkipLink } from '@/shared/components/skip-link';
import { Wordmark } from '@/shared/components/wordmark';
import type { DbLocale } from '@/shared/types/enums';
import { toAppLocale } from '@pkg/i18n/routing';
import { LanguageSwitcher } from '@/widgets/language-switcher/language-switcher.module';
import { SiteFooter } from '@/widgets/site-footer/site-footer.module';
import { SiteHeader } from '@/widgets/site-header/site-header.module';

type PrivacyPageModuleProps = { locale: DbLocale };

/**
 * The privacy policy, in the site's design: the header and footer every page
 * shares, and the policy as the owner wrote it in the dashboard (Page copy →
 * Privacy policy). Until it is written the page says so, and nothing links
 * here (the footer and the contact form check the same text).
 */
export async function PrivacyPageModule({ locale }: PrivacyPageModuleProps) {
  const [{ layout, page, readFailed }, t] = await Promise.all([
    loadPrivacyPageData(locale),
    getTranslations(),
  ]);
  const home = `/${toAppLocale(locale)}`;
  const policy = privacyPolicy(page);
  const title = policy?.heading || page?.title || t('privacy.title');
  const siteName = layout?.siteName || 'STAGER';
  const toInquiry = `${home}#inquiry`;

  return (
    <div data-site className="bg-surface text-ink flex min-h-dvh flex-col">
      <SkipLink label={t('common.skipToContent')} />
      {readFailed ? <ReadFailureNotice message={t('home.readFailed')} /> : null}
      <SiteHeader
        // The way back, in the menu as on the home page: on a phone the
        // header keeps only the menu, and its "Start a Project" sits there.
        links={[{ href: home, label: t('nav.home') }]}
        cta={{ href: toInquiry, label: t('nav.startProject') }}
        brand={
          <a
            href={home}
            aria-label={siteName}
            className="inline-flex min-h-11 shrink-0 items-center"
          >
            <Wordmark className="text-body-lg" />
          </a>
        }
        language={<LanguageSwitcher />}
        menuLanguage={<LanguageSwitcher />}
        labels={{ nav: t('home.sections'), menu: t('home.menu'), close: t('home.close') }}
      />

      <main id={CONTENT_ID} tabIndex={-1} className="px-gutter pb-section flex-1 pt-40">
        <article className="max-w-page mx-auto flex flex-col gap-10">
          <h1
            data-testid="privacy-title"
            className="text-headline font-heading stretch-heading max-w-(--ct-measure) text-balance"
          >
            {title}
          </h1>
          {policy ? (
            <RichText html={policy.body} className="ct-prose" />
          ) : (
            <PendingSlot
              label={t('privacy.pending')}
              hint={t('privacy.pendingHint')}
              className="max-w-xl"
            />
          )}
        </article>
      </main>

      <SiteFooter
        layout={layout}
        links={[
          { href: home, label: t('nav.home') },
          { href: toInquiry, label: t('nav.startProject') },
        ]}
        privacy={null}
        labels={{ sections: t('home.sections'), rights: t('home.rights') }}
      />
    </div>
  );
}
