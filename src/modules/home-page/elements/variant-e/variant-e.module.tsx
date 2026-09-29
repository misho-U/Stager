import { ArrowDownIcon } from '@phosphor-icons/react/dist/ssr/ArrowDown';
import { getFormatter, getTranslations } from 'next-intl/server';
import type { CSSProperties } from 'react';

import type { PublicInsightListItem } from '@/entity/insight/model/insight.model';
import { homeSections, type PublicPage } from '@/entity/page/model/page.model';
import type { PublicProjectListItem } from '@/entity/project/model/project.model';
import type { PublicService } from '@/entity/service/model/service.model';
import type { PublicLayoutData } from '@/entity/site-setting/model/site-setting.model';
import {
  MenuButton,
  MenuPanel,
} from '@/modules/home-page/elements/variant-e/elements/menu-overlay/menu-overlay.module';
import { StagesMotion } from '@/modules/home-page/elements/variant-e/elements/stages-motion/stages-motion.module';
import {
  STAGE_COLOURS,
  STAGES_INTRO_ID,
} from '@/modules/home-page/elements/variant-e/variant-e.constants';
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
import { IntroGateScript } from '@/widgets/intro-gate/intro-gate.module';
import { LanguageSwitcher } from '@/widgets/language-switcher/language-switcher.module';

type VariantEProps = {
  locale: DbLocale;
  content: {
    layout: PublicLayoutData | null;
    page: PublicPage | null;
    projects: ListResponse<PublicProjectListItem>;
    services: ListResponse<PublicService>;
    insights: ListResponse<PublicInsightListItem>;
  };
};

const pad = (value: number) => String(value).padStart(2, '0');

/** A stage's own colour: a background from the story's palette and the ink that goes with it. */
const stageStyle = (index: number) => {
  const colour = STAGE_COLOURS[Math.min(index, STAGE_COLOURS.length - 1)] ?? STAGE_COLOURS[0];
  return { tone: colour.tone, style: { backgroundColor: colour.background } as CSSProperties };
};

/**
 * The stage a service takes: the title card holds the first colour, so the
 * services spread across the other four, whatever their number.
 */
const serviceStage = (index: number, count: number) =>
  count <= 1 ? 1 : 1 + Math.round((index * (STAGE_COLOURS.length - 2)) / (count - 1));

/**
 * Variant E (ე) — "Stages". A film in acts, scored to the scrollbar: a
 * curtain rises on the first visit, the headline assembles and recedes as
 * the next scene slides over it, the intro lights up word by word as it is
 * read, the services are pinned stages that wipe one over the next as the
 * page's colour matures from cream to deep teal, the projects run past as a
 * filmstrip, the reasons roll like credits, and the call to action is the
 * finale.
 */
export async function VariantE({ locale, content }: VariantEProps) {
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
  const menuItems = [
    section.intro ? { href: '#about', label: section.intro.heading || t('nav.about') } : null,
    showServices ? { href: '#services', label: servicesTitle } : null,
    showProjects ? { href: '#projects', label: projectsTitle } : null,
    section.why ? { href: '#why', label: whyTitle } : null,
    { href: toInquiry, label: ctaLabel },
  ].filter((item) => item !== null);

  const siteName = layout?.siteName || 'STAGER';
  const serviceCount = services.items.length;
  const titleCard = stageStyle(0);

  return (
    <StagesMotion>
      {/* The curtain: once per visit, and never under reduced motion or without scripts. */}
      <IntroGateScript id={STAGES_INTRO_ID} />
      <div
        aria-hidden
        data-decorative
        data-intro={STAGES_INTRO_ID}
        data-tone="dark"
        style={{ backgroundColor: 'var(--stage-5)' }}
        className="text-ink fixed inset-0 z-(--z-intro) flex flex-col items-center justify-center gap-8"
      >
        <p data-curtain-word data-enter className="text-headline tracking-wordmark font-bold">
          {siteName}
        </p>
        <span data-curtain-line data-enter className="bg-ink block h-px w-40 origin-left" />
        <p className="text-body-sm text-ink absolute right-(--spacing-gutter) bottom-8">
          {t('home.skipIntro')}
        </p>
      </div>

      <header
        data-stages-header
        data-tone="light"
        className="fixed inset-x-0 top-0 z-(--z-header) transition-colors"
      >
        <div className="max-w-page px-gutter mx-auto flex items-center justify-between gap-6 py-4">
          <Wordmark className="text-ink text-body-lg" />
          <div className="flex items-center gap-2 sm:gap-5">
            <div className="text-ink">
              <LanguageSwitcher />
            </div>
            <MenuButton label={t('home.menu')} />
          </div>
        </div>
      </header>

      <MenuPanel items={menuItems} closeLabel={t('home.close')} title={t('home.sections')} />

      <main>
        {/* Act one: the headline, and the intro sliding up over it. */}
        <div className="relative">
          <section
            aria-labelledby="hero-heading"
            data-scene
            data-tone={titleCard.tone}
            style={titleCard.style}
            className="px-gutter sticky top-0 flex min-h-dvh flex-col items-center justify-center overflow-hidden py-28 text-center"
          >
            <div data-recede className="flex flex-col items-center gap-10">
              <h1
                id="hero-heading"
                data-testid="hero-heading"
                data-enter
                data-assemble
                className="text-display font-hero text-ink max-w-6xl text-balance"
              >
                {section.hero?.heading || (
                  <span className="text-ink-subtle">[no hero heading set]</span>
                )}
              </h1>
              {section.hero?.subheading ? (
                <p data-enter className="text-body-lg text-ink max-w-xl text-pretty">
                  {section.hero.subheading}
                </p>
              ) : null}
              <div data-enter>
                <CtaLink href={toInquiry} size="lg" icon="down">
                  {ctaLabel}
                </CtaLink>
              </div>
            </div>
            <span
              aria-hidden
              data-decorative
              className="stage-cue bg-line absolute bottom-8 left-1/2 block w-px -translate-x-1/2 overflow-hidden"
            >
              <span data-cue className="bg-ink block h-1/3 w-px" />
            </span>
          </section>

          {section.intro ? (
            <section
              id="about"
              aria-labelledby="about-title"
              data-scene
              data-tone={stageStyle(1).tone}
              style={stageStyle(1).style}
              className="px-gutter py-section relative z-(--z-raised) flex min-h-dvh flex-col justify-center"
            >
              <div className="max-w-page mx-auto w-full">
                <h2
                  id="about-title"
                  data-reveal
                  className="text-title font-heading text-ink text-balance"
                >
                  {section.intro.heading || t('nav.about')}
                </h2>
                <div className="mt-12 max-w-5xl">
                  {isBlankHtml(section.intro.body) ? (
                    <PendingSlot
                      label={t('preview.pendingIntro')}
                      hint={t('preview.pendingHint')}
                      className="bg-surface-raised max-w-xl"
                    />
                  ) : (
                    <div data-read-along>
                      <RichText
                        html={section.intro.body}
                        className="text-lead text-ink font-medium text-pretty"
                      />
                    </div>
                  )}
                </div>
              </div>
            </section>
          ) : null}
        </div>

        {/* Act two: the stages. A title card, then one scene per service. */}
        {showServices ? (
          <section id="services" aria-labelledby="services-title" data-stages className="relative">
            <div data-stages-frame className="relative">
              <div
                data-stage-layer
                data-scene
                data-tone={titleCard.tone}
                style={titleCard.style}
                className="px-gutter py-section flex min-h-(--stage-min) flex-col justify-center"
              >
                <div className="max-w-page mx-auto flex w-full flex-col gap-6">
                  <p className="text-body-lg text-ink tabular-nums">
                    {pad(1)}–{pad(serviceCount)}
                  </p>
                  <h2
                    id="services-title"
                    data-stage-title
                    className="text-display font-hero text-ink max-w-5xl text-balance"
                  >
                    {servicesTitle}
                  </h2>
                  {section.services?.subheading ? (
                    <p className="text-body-lg text-ink max-w-xl text-pretty">
                      {section.services.subheading}
                    </p>
                  ) : null}
                </div>
              </div>

              {services.items.map((service, index) => {
                const stage = stageStyle(serviceStage(index, serviceCount));
                return (
                  <article
                    key={service.id}
                    data-stage-layer
                    data-scene
                    data-tone={stage.tone}
                    style={stage.style}
                    className="px-gutter py-section flex min-h-(--stage-min) flex-col justify-center"
                  >
                    <div className="max-w-page mx-auto grid w-full gap-8 lg:grid-cols-12">
                      <div className="flex gap-6 lg:col-span-3 lg:flex-col">
                        <p className="text-headline font-hero text-ink tabular-nums">
                          {pad(index + 1)}
                        </p>
                        {/* Where this stage sits in the story. */}
                        <div
                          aria-hidden
                          data-decorative
                          className="flex min-w-0 flex-1 items-center gap-1.5 lg:flex-none"
                        >
                          {services.items.map((other, position) => (
                            <span
                              key={other.id}
                              className={cn(
                                'bg-ink block h-0.5 max-w-(--stage-rail) flex-1 lg:w-(--stage-rail)',
                                position === index ? 'opacity-100' : 'opacity-25',
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-8 lg:col-span-9">
                        {hasServiceIcon(service.icon) ? (
                          <ServiceIcon name={service.icon} className="text-headline text-ink" />
                        ) : null}
                        <h3
                          data-stage-title
                          className="text-headline font-heading text-ink max-w-4xl text-balance"
                        >
                          {service.title}
                        </h3>
                        {service.shortDescription ? (
                          <p className="text-lead text-ink max-w-3xl text-pretty">
                            {service.shortDescription}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* From here on the page is in its last colour, a finished kitchen's teal. */}
        <div data-surface="inverse" data-tone="dark">
          {showProjects ? (
            <section
              id="projects"
              aria-labelledby="projects-title"
              data-scene
              data-tone="dark"
              data-film
              className="overflow-hidden"
            >
              <div data-film-pin className="flex min-h-dvh flex-col justify-center gap-10 py-24">
                <div className="px-gutter">
                  <div className="max-w-page mx-auto flex flex-col gap-4">
                    <h2
                      id="projects-title"
                      data-reveal
                      className="text-headline font-heading text-balance"
                    >
                      {projectsTitle}
                    </h2>
                    {section.projects?.subheading ? (
                      <p className="text-body-lg text-ink-muted max-w-2xl text-pretty">
                        {section.projects.subheading}
                      </p>
                    ) : null}
                  </div>
                </div>
                {projects.items.length === 0 ? (
                  <p className="px-gutter text-body-lg text-ink-muted max-w-page mx-auto w-full">
                    {t('home.noProjects')}
                  </p>
                ) : (
                  <ul
                    data-testid="project-list"
                    data-film-track
                    className="px-gutter max-w-page mx-auto flex w-full flex-col gap-14"
                  >
                    {projects.items.map((project) => {
                      const meta = joinMeta([project.client, project.location, project.year]);
                      return (
                        <li key={project.id} data-film-frame className="shrink-0">
                          <article className="flex flex-col gap-5">
                            <div
                              data-film-media
                              className="relative h-(--stage-frame-h) overflow-hidden rounded-lg"
                              style={{ backgroundColor: 'var(--stage-4)' }}
                            >
                              {project.cover ? (
                                <div data-parallax className="absolute -inset-x-16 inset-y-0">
                                  <MediaFrame
                                    media={project.cover}
                                    ratio="fill"
                                    sizes="(min-width: 1024px) 62vw, 100vw"
                                    missingLabel={t('preview.photoProject')}
                                    className="size-full"
                                  />
                                </div>
                              ) : (
                                // No photo yet: the frame is a title card for the project.
                                <div
                                  data-parallax
                                  className="absolute inset-0 flex flex-col justify-end gap-2 p-8 sm:p-12"
                                >
                                  {project.year ? (
                                    <span className="text-display font-hero leading-none tabular-nums">
                                      {project.year}
                                    </span>
                                  ) : null}
                                  {project.location ? (
                                    <span className="text-body-lg">{project.location}</span>
                                  ) : null}
                                </div>
                              )}
                            </div>
                            <div className="flex max-w-3xl flex-col gap-2">
                              <h3
                                data-testid="project-title"
                                className="text-title font-heading text-balance"
                              >
                                {project.title}
                              </h3>
                              {meta ? <p className="text-body-sm text-ink-muted">{meta}</p> : null}
                              {project.summary ? (
                                <p className="text-body text-ink-muted text-pretty">
                                  {project.summary}
                                </p>
                              ) : null}
                            </div>
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
            <section
              id="why"
              aria-labelledby="why-title"
              data-scene
              data-tone="dark"
              className="px-gutter py-section"
            >
              {/* The credits: each paragraph sharpens as it crosses the middle of the screen. */}
              <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
                <h2 id="why-title" data-reveal className="text-headline font-heading text-balance">
                  {whyTitle}
                </h2>
                {section.why.subheading ? (
                  <p className="text-body-lg text-ink-muted text-pretty">
                    {section.why.subheading}
                  </p>
                ) : null}
                <div className="mt-10 w-full">
                  {isBlankHtml(section.why.body) ? (
                    <PendingSlot
                      label={t('preview.pendingWhy')}
                      hint={t('preview.pendingHint')}
                      className="mx-auto max-w-xl text-left"
                    />
                  ) : (
                    <div data-credits>
                      <RichText
                        html={section.why.body}
                        className="text-lead font-medium text-pretty"
                      />
                    </div>
                  )}
                </div>
              </div>
            </section>
          ) : null}

          {showInsights ? (
            <section
              id="insights"
              aria-labelledby="insights-title"
              data-scene
              data-tone="dark"
              className="px-gutter py-section"
            >
              <div className="max-w-page mx-auto">
                <h2
                  id="insights-title"
                  data-reveal
                  className="text-headline font-heading text-balance"
                >
                  {section.insights?.heading || t('nav.insights')}
                </h2>
                <ul className="border-line mt-12 border-t">
                  {insights.items.map((insight) => (
                    <li
                      key={insight.id}
                      data-reveal
                      className="border-line grid gap-3 border-b py-8 lg:grid-cols-12 lg:items-baseline lg:gap-8"
                    >
                      <p className="text-body-sm text-ink-muted tabular-nums lg:col-span-3">
                        {joinMeta([
                          insight.category?.name,
                          insight.publishedAt
                            ? format.dateTime(new Date(insight.publishedAt), {
                                dateStyle: 'medium',
                              })
                            : null,
                        ])}
                      </p>
                      <div className="flex flex-col gap-2 lg:col-span-9">
                        <h3 className="text-title font-heading text-pretty">{insight.title}</h3>
                        {insight.excerpt ? (
                          <p className="text-body-lg text-ink-muted max-w-3xl text-pretty">
                            {insight.excerpt}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          {/* The finale. */}
          <section
            id={INQUIRY_ANCHOR}
            aria-labelledby={`${INQUIRY_ANCHOR}-title`}
            data-scene
            data-tone="dark"
            className="px-gutter py-section"
          >
            <div className="max-w-page mx-auto">
              <h2
                id={`${INQUIRY_ANCHOR}-title`}
                data-finale
                className="text-display font-hero max-w-5xl text-balance"
              >
                {section.cta?.heading || t('contact.title')}
              </h2>
              <div className="mt-16 grid gap-14 lg:grid-cols-12 lg:gap-20">
                <div className="flex flex-col gap-6 lg:col-span-4">
                  {section.cta?.subheading ? (
                    <p className="text-body-lg text-ink-muted text-pretty">
                      {section.cta.subheading}
                    </p>
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
                <div className="lg:col-span-8">
                  <InquiryForm
                    locale={locale}
                    submitLabel={section.cta?.ctaLabel || undefined}
                    layout="two-column"
                  />
                </div>
              </div>
            </div>
          </section>

          <footer data-scene data-tone="dark" className="px-gutter pb-10">
            <div className="border-line max-w-page mx-auto flex flex-col gap-4 border-t pt-8 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-6">
                <Wordmark testId="footer-wordmark" />
                {layout?.footerText ? (
                  <p className="text-body-sm text-ink-muted">{layout.footerText}</p>
                ) : null}
              </div>
              <p className="text-body-sm text-ink-subtle">
                © {new Date().getFullYear()} {siteName}
              </p>
            </div>
          </footer>
        </div>
      </main>

      {/* The contextual cursor: shown over the stages and the filmstrip, with a mouse. */}
      <div
        aria-hidden
        data-decorative
        data-stage-cursor
        className="text-title pointer-events-none fixed top-0 left-0 z-(--z-cursor) hidden items-center justify-center rounded-full"
      >
        <ArrowDownIcon data-hint="down" weight="bold" />
      </div>
    </StagesMotion>
  );
}
