import { getFormatter, getTranslations } from 'next-intl/server';

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
import { cn } from '@/shared/lib/cn';
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

/**
 * Variant C (გ) — "Bold". Teal-led: the page opens on a full-width teal block
 * with heavy type, the main photo overlaps its lower edge, services run in a
 * list beside a pinned heading, projects scroll sideways, and the inquiry form
 * closes the page on teal again.
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
    { id: INQUIRY_ANCHOR, title: cta?.heading || t('contact.title') },
  ].filter((item) => item !== null);

  return (
    <>
      {/* The header and the hero are two teal elements that read as one block. */}
      <header data-surface="inverse">
        <div className="max-w-page px-gutter mx-auto flex items-center justify-between gap-4 py-3">
          <Wordmark className="text-title-sm" />
          <nav aria-label={t('home.sections')} className="hidden md:block">
            <ul className="flex items-center gap-6">
              {navItems.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="text-body-sm text-ink-muted hover:text-ink inline-flex min-h-11 items-center transition-colors"
                  >
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <LanguageSwitcher />
        </div>
      </header>

      <main>
        <section data-surface="inverse">
          <div className="max-w-page px-gutter pb-section mx-auto pt-10 md:pt-16 lg:pb-44">
            <h1
              data-testid="hero-heading"
              className="text-display font-hero max-w-6xl text-balance"
            >
              {hero?.heading || <span className="text-ink-subtle">[no hero heading set]</span>}
            </h1>
            <div className="mt-10 flex flex-col items-start gap-8 md:flex-row md:items-end md:justify-between">
              {hero?.subheading ? (
                <p className="text-lead text-ink-muted max-w-xl">{hero.subheading}</p>
              ) : null}
              <CtaLink href={`#${INQUIRY_ANCHOR}`} size="lg" icon="down">
                {ctaLabel}
              </CtaLink>
            </div>
          </div>
        </section>

        <div className="max-w-page px-gutter pb-section mx-auto grid gap-10 pt-10 lg:grid-cols-12 lg:gap-12 lg:pt-0">
          {/* Pulled up over the teal block's lower edge from lg up. */}
          <MediaFrame
            media={hero?.media ?? null}
            ratio="4/5"
            priority
            sizes="(min-width: 1024px) 30rem, 100vw"
            missingLabel={t('preview.photoHero')}
            missingHint={t('preview.photoHint')}
            className="rounded-lg lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:-mt-36"
          />
          {intro ? (
            <section
              id="about"
              aria-labelledby="about-title"
              className="flex flex-col gap-6 lg:col-span-6 lg:row-start-1 lg:pt-20"
            >
              <h2 id="about-title" className="text-headline font-heading text-balance">
                {intro.heading || t('nav.about')}
              </h2>
              {isBlankHtml(intro.body) ? (
                <PendingSlot label={t('preview.pendingIntro')} hint={t('preview.pendingHint')} />
              ) : (
                <RichText html={intro.body} className="text-lead" />
              )}
            </section>
          ) : null}
        </div>

        {showServices ? (
          <section
            id="services"
            aria-labelledby="services-title"
            className="max-w-page px-gutter pb-section mx-auto grid gap-10 lg:grid-cols-12 lg:gap-12"
          >
            <div className="lg:col-span-4">
              <div className="flex flex-col gap-4 lg:sticky lg:top-8">
                <h2 id="services-title" className="text-headline font-heading text-balance">
                  {servicesTitle}
                </h2>
                {whatWeDo?.subheading ? (
                  <p className="text-body-lg text-ink-muted">{whatWeDo.subheading}</p>
                ) : null}
              </div>
            </div>
            <ul className="lg:col-span-8">
              {services.items.map((service) => (
                <li
                  key={service.id}
                  className="border-line-strong flex gap-5 border-t-2 py-8 sm:gap-8"
                >
                  {hasServiceIcon(service.icon) ? (
                    <span className="bg-primary text-title text-on-primary inline-flex size-14 shrink-0 items-center justify-center rounded-md">
                      <ServiceIcon name={service.icon} weight="regular" />
                    </span>
                  ) : null}
                  <div className="flex flex-col gap-2">
                    <h3 className="text-title font-heading">{service.title}</h3>
                    {service.shortDescription ? (
                      <p className="text-body-lg text-ink-muted">{service.shortDescription}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {showProjects ? (
          <section
            id="projects"
            aria-labelledby="projects-title"
            className="max-w-page px-gutter pb-section mx-auto"
          >
            <h2
              id="projects-title"
              className="border-line-strong text-headline font-heading border-t-2 pt-8"
            >
              {projectsTitle}
            </h2>
            {projects.items.length === 0 ? (
              <p className="text-body-lg text-ink-muted mt-6">{t('home.noProjects')}</p>
            ) : (
              // A keyboard user reaches the sideways scroll by tabbing to it.
              <div
                role="region"
                aria-labelledby="projects-title"
                tabIndex={0}
                className="mt-10 overflow-x-auto pb-4"
              >
                <ul data-testid="project-list" className="flex snap-x snap-mandatory gap-6">
                  {projects.items.map((project) => {
                    const meta = joinMeta([project.client, project.location, project.year]);
                    return (
                      <li
                        key={project.id}
                        className="flex w-4/5 shrink-0 snap-start flex-col gap-4 sm:w-80 lg:w-96"
                      >
                        <MediaFrame
                          media={project.cover}
                          ratio="4/5"
                          sizes="(min-width: 1024px) 24rem, 80vw"
                          missingLabel={t('preview.photoProject')}
                          missingHint={t('preview.photoHint')}
                          className="rounded-lg"
                        />
                        <div className="flex flex-col gap-2">
                          {meta ? <p className="text-body-sm text-ink-subtle">{meta}</p> : null}
                          <h3 data-testid="project-title" className="text-title font-heading">
                            {project.title}
                          </h3>
                          {project.summary ? (
                            <p className="text-body text-ink-muted">{project.summary}</p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>
        ) : null}

        {why ? (
          <section
            id="why"
            aria-labelledby="why-title"
            className="max-w-page px-gutter pb-section mx-auto"
          >
            <div className="border-line-strong border-t-2 pt-8">
              <h2 id="why-title" className="text-display font-hero max-w-5xl text-balance">
                {why.heading || t('home.why')}
              </h2>
              <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-12">
                {why.subheading ? (
                  <p className="text-lead lg:col-span-5">{why.subheading}</p>
                ) : null}
                <div className={cn(why.subheading ? 'lg:col-span-7' : 'lg:col-span-8')}>
                  {isBlankHtml(why.body) ? (
                    <PendingSlot label={t('preview.pendingWhy')} hint={t('preview.pendingHint')} />
                  ) : (
                    <RichText
                      html={why.body}
                      className="text-body-lg text-ink-muted md:columns-2 md:gap-x-10"
                    />
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {showInsights ? (
          <section
            id="insights"
            aria-labelledby="insights-title"
            className="max-w-page px-gutter pb-section mx-auto"
          >
            <h2
              id="insights-title"
              className="border-line-strong text-headline font-heading border-t-2 pt-8"
            >
              {latest?.heading || t('nav.insights')}
            </h2>
            <ul className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
              {insights.items.map((insight) => (
                <li key={insight.id} className="flex flex-col gap-3">
                  <p className="text-body-sm text-ink-subtle">
                    {joinMeta([
                      insight.category?.name,
                      insight.publishedAt
                        ? format.dateTime(new Date(insight.publishedAt), { dateStyle: 'long' })
                        : null,
                    ])}
                  </p>
                  <h3 className="text-title font-heading">{insight.title}</h3>
                  {insight.excerpt ? (
                    <p className="text-body text-ink-muted">{insight.excerpt}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {/* The inquiry section and the footer are teal again, closing the page. */}
        <section
          id={INQUIRY_ANCHOR}
          aria-labelledby={`${INQUIRY_ANCHOR}-title`}
          data-surface="inverse"
        >
          <div className="max-w-page px-gutter py-section mx-auto grid gap-12 lg:grid-cols-12">
            <div className="flex flex-col gap-6 lg:col-span-5">
              <h2
                id={`${INQUIRY_ANCHOR}-title`}
                className="text-headline font-heading text-balance"
              >
                {cta?.heading || t('contact.title')}
              </h2>
              {cta?.subheading ? (
                <p className="text-lead text-ink-muted">{cta.subheading}</p>
              ) : null}
              <div className="flex flex-col gap-3 pt-2">
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
            <div className="lg:col-span-7">
              <InquiryForm
                locale={locale}
                submitLabel={cta?.ctaLabel || undefined}
                layout="two-column"
              />
            </div>
          </div>
        </section>
      </main>

      <footer data-surface="inverse">
        <div className="max-w-page px-gutter mx-auto">
          <div className="border-line flex flex-col gap-4 border-t py-8 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-6">
              <Wordmark testId="footer-wordmark" className="text-title-sm" />
              {layout?.footerText ? (
                <p className="text-body-sm text-ink-muted">{layout.footerText}</p>
              ) : null}
            </div>
            <p className="text-body-sm text-ink-subtle">
              © {new Date().getFullYear()} {layout?.siteName || 'STAGER'}
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
