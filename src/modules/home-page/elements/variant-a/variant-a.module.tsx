import { getFormatter, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import type { PublicInsightListItem } from '@/entity/insight/model/insight.model';
import type { PublicPage } from '@/entity/page/model/page.model';
import type { PublicProjectListItem } from '@/entity/project/model/project.model';
import type { PublicService } from '@/entity/service/model/service.model';
import type { PublicLayoutData } from '@/entity/site-setting/model/site-setting.model';
import { ContactDetails } from '@/shared/components/contact-details';
import { CtaLink } from '@/shared/components/cta-link';
import { MediaFrame } from '@/shared/components/media-frame';
import { PendingSlot } from '@/shared/components/pending-slot';
import { RichText } from '@/shared/components/rich-text';
import { SocialLinks } from '@/shared/components/social-links';
import { Wordmark } from '@/shared/components/wordmark';
import { findSection, isBlankHtml, joinMeta } from '@/shared/lib/content';
import type { ListResponse } from '@/shared/types/api';
import type { DbLocale } from '@/shared/types/enums';
import { InquiryForm } from '@/widgets/inquiry-form/inquiry-form.module';
import { INQUIRY_ANCHOR } from '@/widgets/inquiry-form/inquiry-form.constants';
import { LanguageSwitcher } from '@/widgets/language-switcher/language-switcher.module';

type VariantAProps = {
  locale: DbLocale;
  content: {
    layout: PublicLayoutData | null;
    page: PublicPage | null;
    projects: ListResponse<PublicProjectListItem>;
    services: ListResponse<PublicService>;
    insights: ListResponse<PublicInsightListItem>;
  };
};

/**
 * Variant A (ა) — "Editorial". Text-led: a type-only headline, then each
 * section as a ruled block with a quiet heading in the left column and the
 * content, set large, on the right. It never shows an empty photo frame, so
 * it can be judged before any photo exists; a project photo appears beside
 * its entry once one is uploaded.
 */
export async function VariantA({ locale, content }: VariantAProps) {
  const t = await getTranslations();
  const format = await getFormatter();
  const { layout, page, projects, services, insights } = content;

  const hero = findSection(page?.sections, 'hero');
  const intro = findSection(page?.sections, 'intro');
  const whatWeDo = findSection(page?.sections, 'what-we-do');
  const selected = findSection(page?.sections, 'selected-projects');
  const why = findSection(page?.sections, 'why-stager');
  const latest = findSection(page?.sections, 'insights');
  const cta = findSection(page?.sections, 'cta');

  // With the page loaded, a missing section was hidden in the dashboard. If
  // the read failed nothing is known, so the lists with their own reads
  // still show (the page says the read failed).
  const pageFailed = page === null;
  const showServices = services.items.length > 0 && (whatWeDo !== undefined || pageFailed);
  const showProjects = selected !== undefined || pageFailed;
  const showInsights = insights.items.length > 0 && (latest !== undefined || pageFailed);
  const ctaLabel = hero?.ctaLabel || t('nav.startProject');

  const titles = {
    about: intro?.heading || t('nav.about'),
    services: whatWeDo?.heading || t('nav.services'),
    projects: selected?.heading || t('nav.projects'),
    why: why?.heading || t('home.why'),
    insights: latest?.heading || t('nav.insights'),
    [INQUIRY_ANCHOR]: cta?.heading || t('contact.title'),
  };

  // The intro follows the headline directly, so it needs no link of its own.
  const navItems = [
    showServices ? 'services' : null,
    showProjects ? 'projects' : null,
    why ? 'why' : null,
    INQUIRY_ANCHOR,
  ].filter((id): id is keyof typeof titles => id !== null);

  return (
    <>
      <header className="max-w-page border-line px-gutter mx-auto flex items-center justify-between gap-6 border-b py-3">
        <Wordmark className="text-body-lg" />
        <nav aria-label={t('home.sections')} className="hidden lg:block">
          <ul className="flex items-center gap-7">
            {navItems.map((id) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="text-body-sm hover:text-ink-muted inline-flex min-h-11 items-center whitespace-nowrap transition-colors"
                >
                  {titles[id]}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <LanguageSwitcher />
      </header>

      <main>
        <section className="max-w-page px-gutter pb-section mx-auto pt-12 md:pt-24">
          <h1 data-testid="hero-heading" className="text-display font-hero max-w-5xl text-balance">
            {hero?.heading || <span className="text-ink-subtle">[no hero heading set]</span>}
          </h1>
          <div className="mt-10 flex flex-col items-start gap-8 md:mt-14 md:flex-row md:items-end md:justify-between">
            {hero?.subheading ? (
              <p className="text-lead text-ink-muted max-w-2xl">{hero.subheading}</p>
            ) : null}
            <CtaLink href={`#${INQUIRY_ANCHOR}`} size="lg" icon="down">
              {ctaLabel}
            </CtaLink>
          </div>
        </section>

        {intro ? (
          <Chapter id="about" title={titles.about}>
            {isBlankHtml(intro.body) ? (
              <PendingSlot label={t('preview.pendingIntro')} hint={t('preview.pendingHint')} />
            ) : (
              <RichText html={intro.body} className="text-lead max-w-3xl" />
            )}
          </Chapter>
        ) : null}

        {showServices ? (
          <Chapter id="services" title={titles.services}>
            {whatWeDo?.subheading ? (
              <p className="text-lead text-ink-muted mb-10 max-w-2xl">{whatWeDo.subheading}</p>
            ) : null}
            <ul className="grid gap-x-10 gap-y-10 md:grid-cols-2">
              {services.items.map((service) => (
                <li key={service.id} className="flex flex-col gap-2">
                  <h3 className="text-title-sm font-heading">{service.title}</h3>
                  {service.shortDescription ? (
                    <p className="text-body-lg text-ink-muted">{service.shortDescription}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </Chapter>
        ) : null}

        {showProjects ? (
          <Chapter id="projects" title={titles.projects}>
            {projects.items.length === 0 ? (
              <p className="text-body-lg text-ink-muted">{t('home.noProjects')}</p>
            ) : (
              <ul data-testid="project-list" className="flex flex-col gap-14">
                {projects.items.map((project) => {
                  const meta = joinMeta([project.client, project.location, project.year]);
                  return (
                    <li key={project.id} className="grid gap-6 md:grid-cols-8 md:gap-8">
                      <div className="flex flex-col gap-3 md:col-span-5">
                        {meta ? <p className="text-body-sm text-ink-subtle">{meta}</p> : null}
                        <h3 data-testid="project-title" className="text-title font-heading">
                          {project.title}
                        </h3>
                        {project.summary ? (
                          <p className="text-body-lg text-ink-muted">{project.summary}</p>
                        ) : null}
                      </div>
                      {project.cover ? (
                        <MediaFrame
                          media={project.cover}
                          ratio="3/2"
                          sizes="(min-width: 768px) 28vw, 100vw"
                          missingLabel={t('preview.photoProject')}
                          className="md:col-span-3"
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </Chapter>
        ) : null}

        {why ? (
          <Chapter id="why" title={titles.why}>
            {why.subheading ? (
              <p className="text-headline font-hero mb-8 text-balance">{why.subheading}</p>
            ) : null}
            {isBlankHtml(why.body) ? (
              <PendingSlot label={t('preview.pendingWhy')} hint={t('preview.pendingHint')} />
            ) : (
              <RichText html={why.body} className="text-body-lg md:columns-2 md:gap-x-10" />
            )}
          </Chapter>
        ) : null}

        {showInsights ? (
          <Chapter id="insights" title={titles.insights}>
            <ul className="flex flex-col gap-10">
              {insights.items.map((insight) => (
                <li key={insight.id} className="flex max-w-3xl flex-col gap-2">
                  <p className="text-body-sm text-ink-subtle">
                    {joinMeta([
                      insight.category?.name,
                      insight.publishedAt
                        ? format.dateTime(new Date(insight.publishedAt), { dateStyle: 'long' })
                        : null,
                    ])}
                  </p>
                  <h3 className="text-title-sm font-heading">{insight.title}</h3>
                  {insight.excerpt ? (
                    <p className="text-body-lg text-ink-muted">{insight.excerpt}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </Chapter>
        ) : null}

        <Chapter id={INQUIRY_ANCHOR} title={titles[INQUIRY_ANCHOR]}>
          <div className="flex flex-col gap-12">
            {cta?.subheading ? (
              <p className="text-lead text-ink-muted max-w-2xl">{cta.subheading}</p>
            ) : null}
            <div className="max-w-2xl">
              <InquiryForm locale={locale} submitLabel={cta?.ctaLabel || undefined} />
            </div>
            <div className="border-line flex flex-col gap-3 border-t pt-8">
              <h3 className="text-body-sm text-ink-subtle">{t('home.contactDetails')}</h3>
              <ContactDetails
                email={layout?.contactEmail ?? null}
                phone={layout?.phone ?? null}
                address={layout?.address ?? null}
                className="text-body-lg"
              />
              <SocialLinks links={layout?.socialLinks ?? []} />
            </div>
          </div>
        </Chapter>
      </main>

      <footer className="max-w-page px-gutter mx-auto">
        <div className="border-line-strong flex flex-col gap-4 border-t py-8 md:flex-row md:items-baseline md:justify-between">
          <div className="flex flex-col gap-1">
            <Wordmark testId="footer-wordmark" />
            {layout?.footerText ? (
              <p className="text-body-sm text-ink-muted">{layout.footerText}</p>
            ) : null}
          </div>
          <p className="text-body-sm text-ink-subtle">
            © {new Date().getFullYear()} {layout?.siteName || 'STAGER'}
          </p>
        </div>
      </footer>
    </>
  );
}

/**
 * One section: a heavy rule across the page, the heading in the left column
 * like a side-head in a printed page, and the content beside it.
 */
function Chapter({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="max-w-page px-gutter pb-section mx-auto"
    >
      <div className="border-line-strong grid gap-8 border-t pt-6 md:grid-cols-12 md:gap-x-8">
        <h2 id={`${id}-title`} className="text-title font-heading text-balance md:col-span-4">
          {title}
        </h2>
        <div className="md:col-span-8">{children}</div>
      </div>
    </section>
  );
}
