import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { ReadFailureNotice } from '@/shared/components/read-failure-notice';
import { CONTENT_ID, SkipLink } from '@/shared/components/skip-link';
import { Wordmark } from '@/shared/components/wordmark';
import type { DbLocale } from '@/shared/types/enums';
import { toAppLocale } from '@pkg/i18n/routing';
import { INQUIRY_ANCHOR } from '@/widgets/inquiry-form/inquiry-form.constants';
import { LanguageSwitcher } from '@/widgets/language-switcher/language-switcher.module';
import type { SiteChrome } from '@/widgets/site-chrome/site-chrome.service';
import { SiteFooter } from '@/widgets/site-footer/site-footer.module';
import { SiteHeader } from '@/widgets/site-header/site-header.module';
import { SiteMotion } from '@/widgets/site-motion/site-motion.module';
import { StageDecor } from '@/widgets/stage-decor/stage-decor.module';

type SubpageShellProps = {
  locale: DbLocale;
  chrome: SiteChrome;
  /** The page's own reads failed: the page says so, as for the header's. */
  readFailed: boolean;
  /** This page's own link (`/ka/team`), marked as current in the menu. */
  current: string;
  children: ReactNode;
};

/**
 * Every public page beside the home page (the team, the articles, an
 * article, the privacy policy), in the site's design: the dark night of
 * [data-site], the shared header and footer, the site's motion, and one
 * <main>. The menu leads home, to the other pages (each only once it has
 * something to show) and to the contact form on the home page.
 */
export async function SubpageShell({
  locale,
  chrome,
  readFailed,
  current,
  children,
}: SubpageShellProps) {
  const t = await getTranslations();
  const home = `/${toAppLocale(locale)}`;
  const toInquiry = `${home}#${INQUIRY_ANCHOR}`;
  const siteName = chrome.layout?.siteName || 'STAGER';
  const links = [
    { href: home, label: t('nav.home') },
    chrome.teamHref ? { href: chrome.teamHref, label: t('nav.team') } : null,
    chrome.insightsHref ? { href: chrome.insightsHref, label: t('nav.insights') } : null,
    { href: toInquiry, label: t('nav.startProject') },
  ].filter((link) => link !== null);
  const privacy =
    chrome.privacyHref && chrome.privacyHref !== current
      ? { href: chrome.privacyHref, label: t('privacy.title') }
      : null;

  return (
    // `overflow-x-clip`: nothing that moves may widen the page (see the home page).
    <div data-site className="bg-surface text-ink overflow-x-clip">
      <SkipLink label={t('common.skipToContent')} />
      {chrome.failed || readFailed ? <ReadFailureNotice message={t('home.readFailed')} /> : null}
      <SiteMotion className="flex min-h-dvh flex-col">
        <SiteHeader
          links={links}
          current={current}
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
        <main id={CONTENT_ID} tabIndex={-1} className="flex-1">
          {children}
        </main>
        <SiteFooter
          layout={chrome.layout}
          links={links}
          current={current}
          privacy={privacy}
          labels={{ sections: t('home.sections'), rights: t('home.rights') }}
        />
      </SiteMotion>
    </div>
  );
}

type PageHeroProps = {
  title: string;
  /** The line under the title, as written in the dashboard. */
  lead?: string | null;
  /** A line above the title: an article's category and date. */
  meta?: ReactNode;
  testId?: string;
  /** Under the lead: a way back, a call to action. */
  children?: ReactNode;
};

/**
 * The top of a page beside the home page: its title and the line under it,
 * on the stage floor under a pool of light. It arrives like the home page's
 * hero (`data-enter`, never waiting for the script) and is the page's one
 * <h1>; the page's sections follow it inside <main>.
 */
export function PageHero({ title, lead, meta, testId, children }: PageHeroProps) {
  return (
    <section
      aria-labelledby="page-title"
      className="px-gutter relative isolate pt-36 pb-12 lg:pt-44 lg:pb-16"
    >
      <StageDecor light="right" floor="right" />
      <div className="max-w-page mx-auto flex flex-col gap-6">
        {meta ? (
          <div data-enter className="text-body-sm text-ink-muted">
            {meta}
          </div>
        ) : null}
        <h1
          id="page-title"
          data-testid={testId}
          data-enter
          data-ct-headline
          className="text-headline font-heading stretch-heading max-w-4xl text-balance"
        >
          {title}
        </h1>
        {lead ? (
          <p data-enter className="text-lead text-ink-muted max-w-2xl text-pretty">
            {lead}
          </p>
        ) : null}
        {children ? <div data-enter>{children}</div> : null}
      </div>
    </section>
  );
}
