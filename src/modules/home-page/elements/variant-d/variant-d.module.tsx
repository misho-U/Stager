import { ArrowDownIcon } from '@phosphor-icons/react/dist/ssr/ArrowDown';
import { ForkKnifeIcon } from '@phosphor-icons/react/dist/ssr/ForkKnife';
import { SealCheckIcon } from '@phosphor-icons/react/dist/ssr/SealCheck';
import { getFormatter, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import type { PublicInsightListItem } from '@/entity/insight/model/insight.model';
import { homeSections, type PublicPage } from '@/entity/page/model/page.model';
import type { PublicProjectListItem } from '@/entity/project/model/project.model';
import type { PublicService } from '@/entity/service/model/service.model';
import type { PublicLayoutData } from '@/entity/site-setting/model/site-setting.model';
import { LiveDate } from '@/modules/home-page/elements/variant-d/elements/live-date/live-date.module';
import { PassMotion } from '@/modules/home-page/elements/variant-d/elements/pass-motion/pass-motion.module';
import { TicketRail } from '@/modules/home-page/elements/variant-d/elements/ticket-rail/ticket-rail.module';
import { BOARD_TILTS } from '@/modules/home-page/elements/variant-d/variant-d.constants';
import { ContactDetails } from '@/shared/components/contact-details';
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

type VariantDProps = {
  locale: DbLocale;
  content: {
    layout: PublicLayoutData | null;
    page: PublicPage | null;
    projects: ListResponse<PublicProjectListItem>;
    services: ListResponse<PublicService>;
    insights: ListResponse<PublicInsightListItem>;
  };
};

/** Ticket numbers, as a kitchen printer numbers its orders. */
const orderNo = (index: number) => `#${String(index).padStart(2, '0')}`;

/**
 * Variant D (დ) — "Pass". The pass is where a kitchen's work reaches the
 * guest, with the order tickets hanging on a rail above it. The headline is
 * printed on a ticket that feeds out of the rail on the first visit; the
 * services hang on the rail and can be dragged along it, swinging on their
 * clips; projects are tickets pinned to the order board; the reasons to
 * choose STAGER print out as a long receipt; the inquiry is a new order.
 */
export async function VariantD({ locale, content }: VariantDProps) {
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

  return (
    <PassMotion>
      <header
        data-enter
        className="max-w-page px-gutter mx-auto flex items-center justify-between gap-6 py-4"
      >
        <Wordmark className="text-body-lg" />
        <nav aria-label={t('home.sections')} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {navItems.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="text-body-sm text-ink-muted hover:bg-surface-raised hover:text-ink stretch-heading inline-flex min-h-11 items-center rounded-md px-4 font-semibold whitespace-nowrap transition-colors"
                >
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <div className="hidden sm:block">
            <PassKey href={toInquiry}>{ctaLabel}</PassKey>
          </div>
        </div>
      </header>

      <main>
        {/* The first ticket, hanging from the rail. */}
        <section aria-labelledby="hero-heading" className="relative overflow-hidden pb-20">
          <div aria-hidden data-decorative className="pass-rail relative" />
          {/* Pulled up by the rail's thickness, so every clip grips the rail. */}
          <div className="max-w-page px-gutter relative mx-auto -mt-2.5">
            {/* Other orders on the rail, half out of frame, to show a busy pass. */}
            <BlankTicket className="absolute top-0 -left-16 hidden w-72 -rotate-3 lg:block" />
            <BlankTicket className="absolute top-0 -right-12 hidden w-64 rotate-2 lg:block" />

            <div
              data-hang
              data-print
              data-enter
              className="relative mx-auto w-full max-w-(--pass-hero-ticket) origin-top"
            >
              <Clip />
              <article className="pass-ticket bg-surface-raised shadow-card mt-1 px-6 pt-10 sm:px-12">
                <div className="text-body-sm text-ink-muted stretch-heading flex items-center justify-between gap-4 font-semibold">
                  <span className="tracking-wordmark">{layout?.siteName || 'STAGER'}</span>
                  <LiveDate className="tabular-nums" />
                </div>
                <div className="pass-perforation my-6" />
                <h1
                  id="hero-heading"
                  data-testid="hero-heading"
                  className="text-display font-hero stretch-hero text-balance"
                >
                  {section.hero?.heading || (
                    <span className="text-ink-subtle">[no hero heading set]</span>
                  )}
                </h1>
                {section.hero?.subheading ? (
                  <>
                    <div className="pass-perforation my-6" />
                    <p className="text-lead text-ink-muted text-pretty">
                      {section.hero.subheading}
                    </p>
                  </>
                ) : null}
                <div className="mt-10 mb-4">
                  <PassKey href={toInquiry} size="lg" icon>
                    {ctaLabel}
                  </PassKey>
                </div>
              </article>
            </div>

            {section.hero?.media ? (
              <div className="mx-auto mt-14 max-w-4xl">
                <MediaFrame
                  media={section.hero.media}
                  ratio="16/9"
                  sizes="(min-width: 896px) 56rem, 100vw"
                  missingLabel={t('preview.photoHero')}
                  treatment="duotone"
                  className="shadow-card rounded-sm"
                />
              </div>
            ) : null}
          </div>
        </section>

        {/* The page's one marquee: the orders coming in. */}
        {showServices ? (
          <div aria-hidden data-decorative data-surface="inverse" className="overflow-hidden py-4">
            <div data-ticker className="pass-ticker flex">
              {[0, 1].map((copy) => (
                <ul key={copy} className="flex shrink-0 items-center">
                  {services.items.map((service) => (
                    <li
                      key={service.id}
                      className="text-title-sm font-heading stretch-heading flex items-center gap-8 pr-8 whitespace-nowrap"
                    >
                      {service.title}
                      <ForkKnifeIcon aria-hidden className="text-ink-muted" />
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        ) : null}

        {section.intro ? (
          <section id="about" aria-labelledby="about-title" className="px-gutter pt-section">
            <div className="max-w-page mx-auto grid gap-8 lg:grid-cols-12">
              <h2
                id="about-title"
                data-reveal
                className="text-headline font-heading stretch-heading text-balance lg:col-span-12"
              >
                {section.intro.heading || t('nav.about')}
              </h2>
              <div data-reveal className="lg:col-span-8 lg:col-start-5">
                {isBlankHtml(section.intro.body) ? (
                  <PendingSlot
                    label={t('preview.pendingIntro')}
                    hint={t('preview.pendingHint')}
                    className="bg-surface-raised"
                  />
                ) : (
                  <RichText
                    html={section.intro.body}
                    className="text-lead text-ink-muted text-pretty"
                  />
                )}
              </div>
            </div>
          </section>
        ) : null}

        {showServices ? (
          <section id="services" aria-labelledby="services-title" className="pt-section">
            <div className="px-gutter">
              <div data-reveal className="max-w-page mx-auto flex flex-col gap-4">
                <h2
                  id="services-title"
                  className="text-headline font-heading stretch-heading max-w-3xl text-balance"
                >
                  {servicesTitle}
                </h2>
                {section.services?.subheading ? (
                  <p className="text-body-lg text-ink-muted max-w-3xl text-pretty">
                    {section.services.subheading}
                  </p>
                ) : null}
              </div>
            </div>
            <TicketRail
              label={servicesTitle}
              previousLabel={t('home.previous')}
              nextLabel={t('home.next')}
            >
              {services.items.map((service, index) => (
                <article
                  key={service.id}
                  data-hang
                  className="relative w-(--pass-ticket) shrink-0 origin-top snap-start pt-1"
                >
                  <Clip />
                  <div className="pass-ticket bg-surface-raised shadow-card flex h-full flex-col px-6 pt-9">
                    <div className="text-body-sm text-ink-muted stretch-heading flex items-center justify-between font-semibold tabular-nums">
                      <span>{orderNo(index + 1)}</span>
                      {hasServiceIcon(service.icon) ? (
                        <ServiceIcon name={service.icon} className="text-title" />
                      ) : null}
                    </div>
                    <div className="pass-perforation my-5" />
                    <h3 className="text-title font-heading stretch-heading text-balance">
                      {service.title}
                    </h3>
                    {service.shortDescription ? (
                      <p className="text-body text-ink-muted mt-3 text-pretty">
                        {service.shortDescription}
                      </p>
                    ) : null}
                  </div>
                </article>
              ))}
            </TicketRail>
          </section>
        ) : null}

        {showProjects ? (
          <section id="projects" aria-labelledby="projects-title" className="px-gutter pt-section">
            <div className="max-w-page mx-auto">
              <div data-reveal className="flex max-w-3xl flex-col gap-4">
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
                <p className="text-body-lg text-ink-muted mt-8">{t('home.noProjects')}</p>
              ) : (
                // The order board: finished orders pinned up, a little crooked.
                <ul
                  data-testid="project-list"
                  className="mt-14 flex flex-wrap justify-center gap-x-10 gap-y-14"
                >
                  {projects.items.map((project, index) => {
                    const meta = joinMeta([project.client, project.location, project.year]);
                    return (
                      <li
                        key={project.id}
                        data-drop
                        className={cn(
                          'pass-pinned relative w-full max-w-sm pt-2 hover:-translate-y-1.5 hover:rotate-0',
                          BOARD_TILTS[index % BOARD_TILTS.length],
                        )}
                      >
                        <span
                          aria-hidden
                          data-decorative
                          className="bg-primary absolute top-0 left-1/2 z-(--z-raised) size-(--pass-pin) -translate-x-1/2 rounded-full"
                        />
                        <article className="pass-ticket bg-surface-raised shadow-card flex flex-col gap-4 px-5 pt-6">
                          {project.cover ? (
                            <MediaFrame
                              media={project.cover}
                              ratio="4/5"
                              sizes="(min-width: 640px) 24rem, 90vw"
                              missingLabel={t('preview.photoProject')}
                              treatment="duotone"
                              className="rounded-sm"
                            />
                          ) : null}
                          <div className="text-body-sm text-ink-muted stretch-heading flex items-center justify-between font-semibold tabular-nums">
                            <span>{orderNo(index + 1)}</span>
                            {project.year ? <span>{project.year}</span> : null}
                          </div>
                          <div className="pass-perforation" />
                          <h3
                            data-testid="project-title"
                            className="text-title font-heading stretch-heading text-balance"
                          >
                            {project.title}
                          </h3>
                          {meta ? <p className="text-body-sm text-ink-subtle">{meta}</p> : null}
                          {project.summary ? (
                            <p className="text-body text-ink-muted text-pretty">
                              {project.summary}
                            </p>
                          ) : null}
                        </article>
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
            {/* A long receipt, feeding out of the printer as it scrolls in. */}
            <div className="mx-auto flex max-w-(--pass-slot) flex-col items-center">
              <div
                aria-hidden
                data-decorative
                className="pass-slot relative z-(--z-raised) w-full"
              />
              <div
                data-receipt
                className="pass-ticket bg-surface-raised shadow-card -mt-1.5 w-full max-w-(--pass-receipt) px-7 pt-10 sm:px-10"
              >
                <div className="flex flex-col items-center gap-3 text-center">
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
                <div className="pass-perforation my-7" />
                {isBlankHtml(section.why.body) ? (
                  <PendingSlot label={t('preview.pendingWhy')} hint={t('preview.pendingHint')} />
                ) : (
                  <RichText html={section.why.body} className="text-body-lg text-ink text-pretty" />
                )}
                <div className="pass-perforation my-7" />
                <div className="text-body-sm text-ink-muted stretch-heading mb-2 flex items-center justify-between font-semibold">
                  <span className="tracking-wordmark">{layout?.siteName || 'STAGER'}</span>
                  <LiveDate className="tabular-nums" />
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {showInsights ? (
          <section id="insights" aria-labelledby="insights-title" className="px-gutter pt-section">
            <div className="max-w-page mx-auto">
              <h2
                id="insights-title"
                data-reveal
                className="text-headline font-heading stretch-heading text-balance"
              >
                {section.insights?.heading || t('nav.insights')}
              </h2>
              <ul className="mt-12 flex flex-col">
                {insights.items.map((insight, index) => (
                  <li
                    key={insight.id}
                    data-reveal
                    className="border-line grid gap-4 border-t py-8 sm:grid-cols-12 sm:items-center sm:gap-8"
                  >
                    <div className="sm:col-span-3">
                      {insight.publishedAt ? (
                        // A rubber stamp, set down a little crooked.
                        <span
                          className={cn(
                            'border-ink text-ink text-body-sm stretch-heading inline-block rounded-md border-2 px-3 py-1.5 font-bold tabular-nums',
                            index % 2 === 0 ? '-rotate-3' : 'rotate-2',
                          )}
                        >
                          {format.dateTime(new Date(insight.publishedAt), { dateStyle: 'medium' })}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-2 sm:col-span-9">
                      <h3 className="text-title-sm font-heading stretch-heading text-pretty">
                        {insight.title}
                      </h3>
                      {insight.excerpt ? (
                        <p className="text-body text-ink-muted max-w-3xl text-pretty">
                          {insight.excerpt}
                        </p>
                      ) : null}
                      {insight.category?.name ? (
                        <p className="text-body-sm text-ink-subtle">{insight.category.name}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* A new order: the inquiry form, printed on a ticket of its own. */}
        <section
          id={INQUIRY_ANCHOR}
          aria-labelledby={`${INQUIRY_ANCHOR}-title`}
          className="px-gutter py-section"
        >
          <div data-order className="relative mx-auto max-w-4xl">
            <article className="pass-ticket bg-surface-raised shadow-card px-6 pt-10 sm:px-12">
              <div className="text-body-sm text-ink-muted stretch-heading flex items-center justify-between gap-4 font-semibold">
                <span className="tracking-wordmark">{layout?.siteName || 'STAGER'}</span>
                <LiveDate className="tabular-nums" />
              </div>
              <div className="pass-perforation my-6" />
              <div className="flex flex-col gap-3">
                <h2
                  id={`${INQUIRY_ANCHOR}-title`}
                  className="text-headline font-heading stretch-heading text-balance"
                >
                  {section.cta?.heading || t('contact.title')}
                </h2>
                {section.cta?.subheading ? (
                  <p className="text-body-lg text-ink-muted text-pretty">
                    {section.cta.subheading}
                  </p>
                ) : null}
              </div>
              <div className="mt-10">
                <InquiryForm
                  locale={locale}
                  submitLabel={section.cta?.ctaLabel || undefined}
                  layout="two-column"
                />
              </div>
              <div className="pass-perforation my-8" />
              <div className="mb-4 flex flex-col gap-3">
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
            </article>
            {/* Stamped on the ticket once the message is sent (see pass-motion). */}
            <SealCheckIcon
              aria-hidden
              data-decorative
              data-order-stamp
              weight="fill"
              className="text-primary pointer-events-none absolute top-8 right-8 hidden size-24"
            />
          </div>
        </section>
      </main>

      {/* The steel of the pass. */}
      <footer data-surface="inverse">
        <div className="max-w-page px-gutter mx-auto flex flex-col gap-4 py-10 md:flex-row md:items-center md:justify-between">
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
    </PassMotion>
  );
}

/** The clip that holds a ticket to the rail, gripping its top edge. */
function Clip() {
  return (
    <span
      aria-hidden
      data-decorative
      className="pass-clip absolute top-0 left-1/2 z-(--z-raised) block -translate-x-1/2"
    />
  );
}

/** Another order on the rail: printed lines only, to show a busy pass. */
function BlankTicket({ className }: { className?: string }) {
  return (
    <div aria-hidden data-decorative data-hang className={cn('origin-top', className)}>
      <Clip />
      <div className="pass-ticket bg-surface-raised shadow-card mt-1 flex flex-col gap-3 px-6 pt-10">
        {['w-1/3', 'w-full', 'w-5/6', 'w-2/3', 'w-full', 'w-1/2'].map((width, index) => (
          <span
            key={index}
            className={cn('bg-line block h-2 rounded-sm', width, index === 0 && 'mb-3')}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * A call to action as a till key: it sits proud on its darker lower edge
 * and presses down. A link, because it goes somewhere.
 */
function PassKey({
  href,
  children,
  size = 'md',
  icon = false,
}: {
  href: string;
  children: ReactNode;
  size?: 'md' | 'lg';
  icon?: boolean;
}) {
  return (
    <a
      href={href}
      className={cn(
        'pass-key bg-primary text-on-primary hover:bg-primary-hover stretch-heading inline-flex items-center gap-3 rounded-md font-bold whitespace-nowrap',
        size === 'lg' ? 'text-body-lg min-h-14 px-8' : 'text-body min-h-11 px-5',
      )}
    >
      {children}
      {icon ? <ArrowDownIcon aria-hidden weight="bold" /> : null}
    </a>
  );
}
