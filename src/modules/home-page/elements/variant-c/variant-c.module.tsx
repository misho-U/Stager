import { ArrowDownIcon } from '@phosphor-icons/react/dist/ssr/ArrowDown';
import { getFormatter, getTranslations } from 'next-intl/server';
import type { CSSProperties } from 'react';

import type { PublicInsightListItem } from '@/entity/insight/model/insight.model';
import { homeSections, type PublicPage } from '@/entity/page/model/page.model';
import type { PublicProjectListItem } from '@/entity/project/model/project.model';
import type { PublicService } from '@/entity/service/model/service.model';
import type { PublicLayoutData } from '@/entity/site-setting/model/site-setting.model';
import { PlateMotion } from '@/modules/home-page/elements/variant-c/elements/plate-motion/plate-motion.module';
import {
  FAN_PLATES,
  PLATE_SIZES,
} from '@/modules/home-page/elements/variant-c/variant-c.constants';
import { ContactDetails } from '@/shared/components/contact-details';
import { CtaLink } from '@/shared/components/cta-link';
import { MediaFrame } from '@/shared/components/media-frame';
import { PendingSlot } from '@/shared/components/pending-slot';
import { RichText } from '@/shared/components/rich-text';
import { hasServiceIcon, ServiceIcon } from '@/shared/components/service-icon';
import { SocialLinks } from '@/shared/components/social-links';
import { Wordmark } from '@/shared/components/wordmark';
import { cn } from '@/shared/lib/cn';
import { isBlankHtml, joinMeta } from '@/shared/lib/content';
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
 * Variant C (გ) — "Plate". Everything in hospitality comes to the plate: a
 * big plate rolls in beside the headline, a round call to action turns in a
 * ring of its own words, the services sit on a lazy Susan that turns them to
 * face you, the projects are plates set round a table, and an iris opens
 * onto the inquiry form. No square corner anywhere.
 */
export async function VariantC({ locale, content }: VariantCProps) {
  const t = await getTranslations();
  const format = await getFormatter();
  const { layout, page, projects, services, insights } = content;
  const section = homeSections(page);

  // With the page loaded, a missing section was hidden in the dashboard. If
  // the read failed nothing is known, so the lists with their own reads
  // still show (the page says the read failed).
  const pageFailed = page === null;
  const showServices = services.items.length > 0 && (section.services !== undefined || pageFailed);
  const showProjects = section.projects !== undefined || pageFailed;
  const showInsights = insights.items.length > 0 && (section.insights !== undefined || pageFailed);
  const ctaLabel = section.hero?.ctaLabel || t('nav.startProject');
  const toInquiry = `#${INQUIRY_ANCHOR}`;

  const servicesTitle = section.services?.heading || t('nav.services');
  const projectsTitle = section.projects?.heading || t('nav.projects');
  const whyTitle = section.why?.heading || t('home.why');
  const navItems = [
    showServices ? { id: 'services', title: servicesTitle } : null,
    showProjects ? { id: 'projects', title: projectsTitle } : null,
    section.why ? { id: 'why', title: whyTitle } : null,
  ].filter((item) => item !== null);

  const seatAngle = 360 / Math.max(services.items.length, 1);

  return (
    <PlateMotion>
      {/* A floating pill that tucks away while reading down and returns on the way up. */}
      <header
        data-enter
        data-plate-header
        className="px-gutter fixed inset-x-0 top-0 z-(--z-header) pt-3"
      >
        <div className="bg-surface-raised shadow-card max-w-page mx-auto flex items-center justify-between gap-6 rounded-full py-2 pr-2 pl-6">
          <Wordmark className="text-body-lg" />
          <nav aria-label={t('home.sections')} className="hidden lg:block">
            <ul className="flex items-center gap-7">
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
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <div data-magnet className="hidden sm:block">
              <CtaLink href={toInquiry} className="rounded-full">
                {ctaLabel}
              </CtaLink>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section aria-labelledby="hero-heading" className="relative overflow-hidden">
          <div className="max-w-page px-gutter relative mx-auto grid min-h-dvh items-center gap-10 pt-(--plate-header-space) pb-16 lg:grid-cols-12">
            <div className="relative z-(--z-raised) flex flex-col gap-8 lg:col-span-8">
              <h1
                id="hero-heading"
                data-testid="hero-heading"
                data-enter
                data-words
                className="text-display font-hero stretch-hero text-balance"
              >
                {section.hero?.heading || (
                  <span className="text-ink-subtle">[no hero heading set]</span>
                )}
              </h1>
              {section.hero?.subheading ? (
                <p data-enter className="text-lead text-ink-muted max-w-md text-pretty">
                  {section.hero.subheading}
                </p>
              ) : null}
            </div>

            {/* The plate, bleeding off the right edge, and the round call to action on its rim. */}
            <div className="relative aspect-square w-full lg:col-span-4 lg:aspect-auto lg:h-full">
              <div
                aria-hidden
                data-decorative
                data-plate
                className="plate-hero absolute top-1/2 left-1/6 -translate-y-1/2 lg:left-0"
              >
                <span data-rim className="plate-rim" />
                <span data-rim className="plate-well-edge" />
                <span data-rim className="plate-well">
                  {section.hero?.media ? (
                    <MediaFrame
                      media={section.hero.media}
                      ratio="fill"
                      priority
                      sizes="(min-width: 1024px) 28rem, 60vw"
                      missingLabel={t('preview.photoHero')}
                      className="size-full"
                    />
                  ) : null}
                </span>
              </div>

              <div
                data-cta-ring
                className="absolute bottom-6 left-0 size-(--plate-cta) lg:bottom-1/6 lg:-left-16"
              >
                <TurningRing label={ctaLabel} />
                <a
                  href={toInquiry}
                  data-magnet
                  className="bg-primary text-on-primary hover:bg-primary-hover text-body-sm absolute inset-4 flex flex-col items-center justify-center gap-1 rounded-full px-3 text-center font-semibold transition-colors"
                >
                  <span className="text-balance">{ctaLabel}</span>
                  <ArrowDownIcon aria-hidden size="1.2em" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {section.intro ? (
          <section id="about" aria-labelledby="about-title" className="px-gutter pt-section">
            <div className="mx-auto flex max-w-4xl flex-col items-center gap-10 text-center">
              {/* Three plates, stacked, that fan out across the table as they scroll in. */}
              <div
                aria-hidden
                data-decorative
                data-fan
                className="relative flex h-(--plate-fan) w-full justify-center"
              >
                {Array.from({ length: FAN_PLATES }, (_, index) => (
                  <span
                    key={index}
                    data-fan-plate={index}
                    className={cn(
                      'absolute top-0 size-(--plate-fan) overflow-hidden rounded-full',
                      index === 0 && 'bg-(--plate-sage)',
                      index === 1 && 'z-(--z-raised) bg-(--plate-teal)',
                      index === 2 && 'border-line border bg-(--plate-cream)',
                    )}
                  >
                    {index === 1 && section.intro?.media ? (
                      <MediaFrame
                        media={section.intro.media}
                        ratio="fill"
                        sizes="9rem"
                        missingLabel={t('preview.photoSection')}
                        className="size-full"
                      />
                    ) : null}
                  </span>
                ))}
              </div>
              <h2
                id="about-title"
                data-reveal
                className="text-headline font-heading stretch-heading text-balance"
              >
                {section.intro.heading || t('nav.about')}
              </h2>
              <div data-reveal className="w-full max-w-2xl">
                {isBlankHtml(section.intro.body) ? (
                  <PendingSlot
                    label={t('preview.pendingIntro')}
                    hint={t('preview.pendingHint')}
                    className="text-left"
                  />
                ) : (
                  <RichText
                    html={section.intro.body}
                    className="plate-dots text-lead text-ink-muted text-pretty"
                  />
                )}
              </div>
            </div>
          </section>
        ) : null}

        {showServices ? (
          <section id="services" aria-labelledby="services-title" data-susan className="relative">
            <div className="max-w-page px-gutter py-section mx-auto grid items-center gap-12 lg:min-h-dvh lg:grid-cols-12 lg:gap-16">
              {/* The lazy Susan: a dish per service round the rim, turned by the scroll. */}
              <div
                aria-hidden
                data-decorative
                className="hidden justify-center lg:col-span-6 lg:flex"
              >
                <div data-wheel className="plate-wheel relative bg-(--plate-cream)">
                  <span className="border-line absolute inset-5 rounded-full border" />
                  <span className="absolute inset-1/3 rounded-full bg-(--plate-teal)" />
                  {services.items.map((service, index) => (
                    <span
                      key={service.id}
                      className="plate-seat"
                      style={{ '--angle': `${seatAngle * index}deg` } as CSSProperties}
                    >
                      <span
                        data-dish
                        className="text-ink text-headline flex size-full items-center justify-center rounded-full bg-(--plate-sage)"
                      >
                        <ServiceIcon name={service.icon} />
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4 lg:col-span-6">
                <h2
                  id="services-title"
                  data-reveal
                  className="text-headline font-heading stretch-heading text-balance"
                >
                  {servicesTitle}
                </h2>
                {section.services?.subheading ? (
                  <p data-reveal className="text-body-lg text-ink-muted text-pretty">
                    {section.services.subheading}
                  </p>
                ) : null}
                <ol data-susan-list className="mt-8 flex flex-col gap-10">
                  {services.items.map((service, index) => (
                    <li key={service.id} data-susan-item className="flex items-start gap-5">
                      {hasServiceIcon(service.icon) ? (
                        <span
                          data-susan-badge
                          className="bg-primary text-on-primary text-title-sm flex size-(--plate-badge) shrink-0 items-center justify-center rounded-full"
                        >
                          <ServiceIcon name={service.icon} weight="regular" />
                        </span>
                      ) : null}
                      <div className="flex flex-col gap-3">
                        <p className="text-body-sm text-ink-subtle tabular-nums">
                          {index + 1} / {services.items.length}
                        </p>
                        <h3 className="text-title font-heading stretch-heading text-balance">
                          {service.title}
                        </h3>
                        {service.shortDescription ? (
                          <p className="text-body-lg text-ink-muted max-w-lg text-pretty">
                            {service.shortDescription}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>
        ) : null}

        {showProjects ? (
          <section id="projects" aria-labelledby="projects-title" className="px-gutter pt-section">
            <div className="max-w-page mx-auto">
              <div data-reveal className="mx-auto flex max-w-3xl flex-col gap-4 text-center">
                <h2
                  id="projects-title"
                  className="text-headline font-heading stretch-heading text-balance"
                >
                  {projectsTitle}
                </h2>
                {section.projects?.subheading ? (
                  <p className="text-body-lg text-ink-muted text-pretty">
                    {section.projects.subheading}
                  </p>
                ) : null}
              </div>
              {projects.items.length === 0 ? (
                <p className="text-body-lg text-ink-muted mt-10 text-center">
                  {t('home.noProjects')}
                </p>
              ) : (
                // Plates set round a table: three sizes, every other one lower.
                <ul
                  data-testid="project-list"
                  className="mt-16 flex flex-wrap items-start justify-center gap-x-12 gap-y-16"
                >
                  {projects.items.map((project, index) => {
                    const meta = joinMeta([project.client, project.location]);
                    const teal = index % 2 === 0;
                    return (
                      <li
                        key={project.id}
                        data-plate-project
                        className={cn(
                          'flex max-w-full flex-col items-center gap-6 text-center',
                          PLATE_SIZES[index % PLATE_SIZES.length],
                          index % 2 === 1 && 'md:mt-(--plate-offset)',
                        )}
                      >
                        <div className="plate-turn relative aspect-square w-full overflow-hidden rounded-full">
                          {project.cover ? (
                            <MediaFrame
                              media={project.cover}
                              ratio="fill"
                              sizes="(min-width: 768px) 22rem, 90vw"
                              missingLabel={t('preview.photoProject')}
                              className="size-full"
                            />
                          ) : (
                            // No photo yet: a plate set with the year, or the name's first letter.
                            <span
                              aria-hidden
                              className={cn(
                                'flex size-full items-center justify-center rounded-full',
                                teal
                                  ? 'bg-primary text-on-primary'
                                  : 'border-line text-ink border bg-(--plate-cream)',
                              )}
                            >
                              <span className="text-headline font-hero tabular-nums">
                                {project.year ?? project.title.trim().charAt(0)}
                              </span>
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <h3
                            data-testid="project-title"
                            className="text-title-sm font-heading stretch-heading text-balance"
                          >
                            {project.title}
                          </h3>
                          {meta ? <p className="text-body-sm text-ink-subtle">{meta}</p> : null}
                          {project.summary ? (
                            <p className="text-body-sm text-ink-muted text-pretty">
                              {project.summary}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        ) : null}

        {section.why ? (
          <section id="why" aria-labelledby="why-title" className="px-gutter pt-section">
            <div
              data-reveal
              className="bg-surface-muted max-w-page mx-auto grid gap-10 rounded-xl px-6 py-14 sm:px-14 lg:grid-cols-12 lg:gap-16 lg:px-20 lg:py-20"
            >
              <div className="flex flex-col gap-4 lg:col-span-5">
                <h2
                  id="why-title"
                  className="text-headline font-heading stretch-heading text-balance"
                >
                  {whyTitle}
                </h2>
                {section.why.subheading ? (
                  <p className="text-body-lg text-ink-muted text-pretty">
                    {section.why.subheading}
                  </p>
                ) : null}
              </div>
              <div className="lg:col-span-7">
                {isBlankHtml(section.why.body) ? (
                  <PendingSlot label={t('preview.pendingWhy')} hint={t('preview.pendingHint')} />
                ) : (
                  <RichText
                    html={section.why.body}
                    className="plate-dots text-lead text-ink text-pretty"
                  />
                )}
              </div>
            </div>
          </section>
        ) : null}

        {showInsights ? (
          <section id="insights" aria-labelledby="insights-title" className="px-gutter pt-section">
            <div className="mx-auto max-w-4xl">
              <h2
                id="insights-title"
                data-reveal
                className="text-headline font-heading stretch-heading text-center text-balance"
              >
                {section.insights?.heading || t('nav.insights')}
              </h2>
              <ul className="mt-12 flex flex-col gap-4">
                {insights.items.map((insight) => {
                  const date = insight.publishedAt ? new Date(insight.publishedAt) : null;
                  return (
                    <li
                      key={insight.id}
                      data-reveal
                      className="bg-surface-raised flex items-center gap-6 rounded-lg p-3 pr-8"
                    >
                      <span className="bg-primary text-on-primary flex size-(--plate-date) shrink-0 flex-col items-center justify-center rounded-full">
                        {date ? (
                          <>
                            <span className="text-title-sm font-heading leading-none tabular-nums">
                              {format.dateTime(date, { day: 'numeric' })}
                            </span>
                            <span className="text-caption">
                              {format.dateTime(date, { month: 'short' })}
                            </span>
                          </>
                        ) : null}
                      </span>
                      <div className="flex min-w-0 flex-col gap-1 py-2">
                        <h3 className="text-title-sm font-heading stretch-heading text-pretty">
                          {insight.title}
                        </h3>
                        {insight.category?.name ? (
                          <p className="text-body-sm text-ink-subtle">{insight.category.name}</p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        ) : null}

        {/* The iris: a teal circle that opens from the middle onto the form, and the page ends on teal. */}
        <div data-iris data-surface="inverse" className="mt-section">
          <section
            id={INQUIRY_ANCHOR}
            aria-labelledby={`${INQUIRY_ANCHOR}-title`}
            className="max-w-page px-gutter py-section mx-auto grid gap-14 lg:grid-cols-12 lg:gap-20"
          >
            <div className="flex flex-col gap-8 lg:col-span-5">
              <h2
                id={`${INQUIRY_ANCHOR}-title`}
                className="text-headline font-heading stretch-heading text-balance"
              >
                {section.cta?.heading || t('contact.title')}
              </h2>
              {section.cta?.subheading ? (
                <p className="text-body-lg text-ink-muted text-pretty">{section.cta.subheading}</p>
              ) : null}
              <div className="flex flex-col gap-3">
                <h3 className="text-body-sm text-ink-muted font-medium">
                  {t('home.contactDetails')}
                </h3>
                <ContactDetails
                  email={layout?.contactEmail ?? null}
                  phone={layout?.phone ?? null}
                  address={layout?.address ?? null}
                />
                <SocialLinks links={layout?.socialLinks ?? []} />
              </div>
            </div>
            <div className="lg:col-span-7">
              <InquiryForm
                locale={locale}
                submitLabel={section.cta?.ctaLabel || undefined}
                layout="two-column"
              />
            </div>
          </section>

          <footer className="max-w-page px-gutter mx-auto pb-10">
            <div className="border-line flex flex-col gap-4 border-t pt-8 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-6">
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
        </div>
      </main>
    </PlateMotion>
  );
}

/**
 * The call to action's own words, turning round it on a circle. A decoration
 * only: the link inside carries the label for everyone else.
 */
function TurningRing({ label }: { label: string }) {
  const text = Array.from({ length: 3 }, () => label).join('  •  ') + '  •  ';
  return (
    <svg
      aria-hidden
      data-decorative
      data-ring
      viewBox="0 0 200 200"
      className="text-ink absolute inset-0 size-full overflow-visible"
    >
      <defs>
        <path id="plate-ring-path" d="M100,100 m-88,0 a88,88 0 1,1 176,0 a88,88 0 1,1 -176,0" />
      </defs>
      <text className="plate-ring-text" fill="currentColor">
        <textPath href="#plate-ring-path" textLength="550" lengthAdjust="spacing">
          {text}
        </textPath>
      </text>
    </svg>
  );
}
