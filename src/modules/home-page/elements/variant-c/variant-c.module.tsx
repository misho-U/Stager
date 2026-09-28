import { getFormatter, getTranslations } from 'next-intl/server';
import type { CSSProperties } from 'react';

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
import { hasServiceIcon, ServiceIcon } from '@/shared/components/service-icon';
import { SocialLinks } from '@/shared/components/social-links';
import { Wordmark } from '@/shared/components/wordmark';
import { findSection, isBlankHtml, joinMeta } from '@/shared/lib/content';
import type { ListResponse } from '@/shared/types/api';
import type { DbLocale } from '@/shared/types/enums';
import { InquiryForm } from '@/widgets/inquiry-form/inquiry-form.module';
import { INQUIRY_ANCHOR } from '@/widgets/inquiry-form/inquiry-form.constants';
import { LanguageSwitcher } from '@/widgets/language-switcher/language-switcher.module';

type VariantCProps = {
  locale: DbLocale;
  content: {
    layout: PublicLayoutData | null;
    page: PublicPage | null;
    projects: ListResponse<PublicProjectListItem>;
    services: ListResponse<PublicService>;
    insights: ListResponse<PublicInsightListItem>;
  };
};

/** Staggers the pane's entrance: each part starts a step after the last. */
const step = (index: number) => ({ '--i': index }) as CSSProperties;

/** Each section on the scrolling side: its own air, the same text measure. */
const SECTION_CLASS = 'px-gutter pt-section max-w-3xl';

/**
 * Variant C (გ) — "Pinned". Split screen: on a desktop a deep-teal pane holds
 * the headline, "Start a Project" and the contact details in view while the
 * other side scrolls, and a thin line in it fills as the page is read. A hero
 * photo is redrawn in duotone, teal to cream. On a phone the pane is the
 * opening screen.
 */
export async function VariantC({ locale, content }: VariantCProps) {
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
  const servicesTitle = whatWeDo?.heading || t('nav.services');
  const projectsTitle = selected?.heading || t('nav.projects');

  const navItems = [
    showServices ? { id: 'services', title: servicesTitle } : null,
    showProjects ? { id: 'projects', title: projectsTitle } : null,
    why ? { id: 'why', title: why.heading || t('home.why') } : null,
  ].filter((item) => item !== null);

  return (
    <div className="lg:grid lg:grid-cols-12">
      {/* The pane. `self-start` lets it stay a window tall and stick while
          the other column scrolls past. */}
      <div
        data-surface="inverse"
        className="flex flex-col lg:sticky lg:top-0 lg:col-span-5 lg:h-dvh lg:self-start"
      >
        <header className="px-gutter flex items-center justify-between gap-4 py-4">
          <Wordmark className="text-body-lg" />
          <LanguageSwitcher />
        </header>

        {/* The hero stays with the pane, outside <main>: on a desktop it is
            the part of the page that never scrolls away. */}
        <section
          aria-labelledby="hero-title"
          className="px-gutter flex flex-1 flex-col gap-10 pt-8 pb-10 lg:min-h-0 lg:pt-4 lg:pb-24"
        >
          <div className="flex flex-col items-start gap-6">
            <h1
              id="hero-title"
              data-testid="hero-heading"
              style={step(0)}
              className="text-display font-hero stretch-hero animate-rise stagger text-balance"
            >
              {hero?.heading || <span className="text-ink-subtle">[no hero heading set]</span>}
            </h1>
            {hero?.subheading ? (
              <p
                style={step(1)}
                className="text-lead text-ink-muted animate-rise stagger max-w-md text-pretty"
              >
                {hero.subheading}
              </p>
            ) : null}
            <div style={step(2)} className="animate-rise stagger pt-2">
              <CtaLink href={`#${INQUIRY_ANCHOR}`} size="lg" icon="down">
                {ctaLabel}
              </CtaLink>
            </div>
          </div>

          {/* Whatever height is left over goes to the photo. */}
          <div style={step(3)} className="animate-rise stagger flex min-h-64 flex-1 lg:min-h-40">
            <MediaFrame
              media={hero?.media ?? null}
              ratio="fill"
              priority
              sizes="(min-width: 1024px) 40vw, 100vw"
              missingLabel={t('preview.photoHero')}
              missingHint={t('preview.photoHint')}
              empty="outlined"
              treatment="duotone"
              className="rounded-lg"
            />
          </div>

          <div className="flex flex-col gap-3">
            <ContactDetails
              email={layout?.contactEmail ?? null}
              phone={layout?.phone ?? null}
              address={layout?.address ?? null}
              className="text-body-sm"
            />
            {/* How far down the page the reader is, while the pane stands still. */}
            <div aria-hidden className="bg-line hidden h-px lg:block">
              <div className="bg-ink scroll-progress h-px" />
            </div>
          </div>
        </section>
      </div>

      <div className="lg:col-span-7">
        {navItems.length > 0 ? (
          <nav aria-label={t('home.sections')} className="px-gutter hidden pt-6 lg:block">
            <ul className="flex flex-wrap items-center gap-x-8">
              {navItems.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="text-body-sm text-ink-muted hover:text-ink inline-flex min-h-11 items-center whitespace-nowrap transition-colors"
                  >
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <main>
          {intro ? (
            <section id="about" aria-labelledby="about-title" className={SECTION_CLASS}>
              <h2
                id="about-title"
                className="text-headline font-heading stretch-heading text-balance"
              >
                {intro.heading || t('nav.about')}
              </h2>
              <div className="mt-8 flex flex-col gap-10">
                {isBlankHtml(intro.body) ? (
                  <PendingSlot label={t('preview.pendingIntro')} hint={t('preview.pendingHint')} />
                ) : (
                  <RichText html={intro.body} className="text-lead text-pretty" />
                )}
                {intro.media ? (
                  <MediaFrame
                    media={intro.media}
                    ratio="3/2"
                    sizes="(min-width: 1024px) 45vw, 100vw"
                    missingLabel={t('preview.photoSection')}
                    className="rounded-lg"
                  />
                ) : null}
              </div>
            </section>
          ) : null}

          {showServices ? (
            <section id="services" aria-labelledby="services-title" className={SECTION_CLASS}>
              <h2
                id="services-title"
                className="text-headline font-heading stretch-heading text-balance"
              >
                {servicesTitle}
              </h2>
              {whatWeDo?.subheading ? (
                <p className="text-body-lg text-ink-muted mt-4 text-pretty">
                  {whatWeDo.subheading}
                </p>
              ) : null}
              <ul className="mt-10 grid gap-x-10 gap-y-12 sm:grid-cols-2">
                {services.items.map((service) => (
                  <li key={service.id} className="flex flex-col gap-3">
                    {service.cover ? (
                      <MediaFrame
                        media={service.cover}
                        ratio="3/2"
                        sizes="(min-width: 1024px) 22vw, (min-width: 640px) 50vw, 100vw"
                        missingLabel={service.title}
                        className="mb-2 rounded-lg"
                      />
                    ) : hasServiceIcon(service.icon) ? (
                      <span className="text-headline text-ink-muted mb-1">
                        <ServiceIcon name={service.icon} weight="duotone" />
                      </span>
                    ) : null}
                    <h3 className="text-title-sm font-heading stretch-heading font-medium">
                      {service.title}
                    </h3>
                    {service.shortDescription ? (
                      <p className="text-body text-ink-muted text-pretty">
                        {service.shortDescription}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {showProjects ? (
            <section id="projects" aria-labelledby="projects-title" className={SECTION_CLASS}>
              <h2
                id="projects-title"
                className="text-headline font-heading stretch-heading text-balance"
              >
                {projectsTitle}
              </h2>
              {projects.items.length === 0 ? (
                <p className="text-body-lg text-ink-muted mt-6">{t('home.noProjects')}</p>
              ) : (
                <ul data-testid="project-list" className="mt-10 flex flex-col gap-14">
                  {projects.items.map((project) => {
                    const meta = joinMeta([project.client, project.location, project.year]);
                    return (
                      <li key={project.id} className="flex flex-col gap-5">
                        <MediaFrame
                          media={project.cover}
                          ratio="3/2"
                          sizes="(min-width: 1024px) 45vw, 100vw"
                          missingLabel={t('preview.photoProject')}
                          missingHint={t('preview.photoHint')}
                          empty="outlined"
                          className="rounded-lg"
                        />
                        <div className="flex flex-col gap-2">
                          {meta ? <p className="text-body-sm text-ink-subtle">{meta}</p> : null}
                          <h3
                            data-testid="project-title"
                            className="text-title font-heading stretch-heading"
                          >
                            {project.title}
                          </h3>
                          {project.summary ? (
                            <p className="text-body-lg text-ink-muted text-pretty">
                              {project.summary}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : null}

          {why ? (
            <section id="why" aria-labelledby="why-title" className={SECTION_CLASS}>
              <h2
                id="why-title"
                className="text-headline font-heading stretch-heading text-balance"
              >
                {why.heading || t('home.why')}
              </h2>
              {why.subheading ? (
                <p className="text-lead text-ink-muted mt-4 text-pretty">{why.subheading}</p>
              ) : null}
              <div className="mt-8">
                {isBlankHtml(why.body) ? (
                  <PendingSlot label={t('preview.pendingWhy')} hint={t('preview.pendingHint')} />
                ) : (
                  <RichText html={why.body} className="text-lead text-pretty" />
                )}
              </div>
            </section>
          ) : null}

          {showInsights ? (
            <section id="insights" aria-labelledby="insights-title" className={SECTION_CLASS}>
              <h2
                id="insights-title"
                className="text-headline font-heading stretch-heading text-balance"
              >
                {latest?.heading || t('nav.insights')}
              </h2>
              <ul className="mt-8">
                {insights.items.map((insight) => (
                  <li key={insight.id} className="border-line flex flex-col gap-2 border-t py-6">
                    <p className="text-body-sm text-ink-subtle">
                      {joinMeta([
                        insight.category?.name,
                        insight.publishedAt
                          ? format.dateTime(new Date(insight.publishedAt), { dateStyle: 'long' })
                          : null,
                      ])}
                    </p>
                    <h3 className="text-title-sm font-heading stretch-heading font-medium">
                      {insight.title}
                    </h3>
                    {insight.excerpt ? (
                      <p className="text-body text-ink-muted text-pretty">{insight.excerpt}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section
            id={INQUIRY_ANCHOR}
            aria-labelledby={`${INQUIRY_ANCHOR}-title`}
            className={SECTION_CLASS}
          >
            <h2
              id={`${INQUIRY_ANCHOR}-title`}
              className="text-headline font-heading stretch-heading text-balance"
            >
              {cta?.heading || t('contact.title')}
            </h2>
            {cta?.subheading ? (
              <p className="text-body-lg text-ink-muted mt-4 text-pretty">{cta.subheading}</p>
            ) : null}
            <div className="mt-10">
              <InquiryForm
                locale={locale}
                submitLabel={cta?.ctaLabel || undefined}
                layout="two-column"
              />
            </div>
            <SocialLinks links={layout?.socialLinks ?? []} className="mt-10" />
          </section>
        </main>

        <footer className="px-gutter py-section max-w-3xl">
          <div className="border-line flex flex-col gap-3 border-t pt-8">
            <Wordmark testId="footer-wordmark" />
            {layout?.footerText ? (
              <p className="text-body-sm text-ink-muted">{layout.footerText}</p>
            ) : null}
            <p className="text-body-sm text-ink-subtle">
              © {new Date().getFullYear()} {layout?.siteName || 'STAGER'}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
