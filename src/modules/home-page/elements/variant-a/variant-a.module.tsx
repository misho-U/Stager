import { getFormatter, getTranslations } from 'next-intl/server';

import type { PublicInsightListItem } from '@/entity/insight/model/insight.model';
import { homeSections, type PublicPage } from '@/entity/page/model/page.model';
import type { PublicProjectListItem } from '@/entity/project/model/project.model';
import type { PublicService } from '@/entity/service/model/service.model';
import type { PublicLayoutData } from '@/entity/site-setting/model/site-setting.model';
import { CarteMotion } from '@/modules/home-page/elements/variant-a/elements/carte-motion/carte-motion.module';
import { ContactDetails } from '@/shared/components/contact-details';
import { CtaLink } from '@/shared/components/cta-link';
import { MediaFrame } from '@/shared/components/media-frame';
import { PendingSlot } from '@/shared/components/pending-slot';
import { RichText } from '@/shared/components/rich-text';
import { SocialLinks } from '@/shared/components/social-links';
import { Wordmark } from '@/shared/components/wordmark';
import { cn } from '@/shared/lib/cn';
import { isBlankHtml, joinMeta } from '@/shared/lib/content';
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
 * The eight lines of the double border round the first screen: an outer
 * frame and an inner one --carte-rule-gap inside it, each side drawn on its
 * own so it can grow out from its middle (`data-frame-line`, x or y).
 */
const FRAME_LINES = [
  { axis: 'x', inner: false, className: 'inset-x-0 top-0 h-px' },
  { axis: 'x', inner: false, className: 'inset-x-0 bottom-0 h-px' },
  { axis: 'y', inner: false, className: 'inset-y-0 left-0 w-px' },
  { axis: 'y', inner: false, className: 'inset-y-0 right-0 w-px' },
  {
    axis: 'x',
    inner: true,
    className: 'inset-x-(--carte-rule-gap) top-(--carte-rule-gap) h-px',
  },
  {
    axis: 'x',
    inner: true,
    className: 'inset-x-(--carte-rule-gap) bottom-(--carte-rule-gap) h-px',
  },
  {
    axis: 'y',
    inner: true,
    className: 'inset-y-(--carte-rule-gap) left-(--carte-rule-gap) w-px',
  },
  {
    axis: 'y',
    inner: true,
    className: 'inset-y-(--carte-rule-gap) right-(--carte-rule-gap) w-px',
  },
] as const;

/** A diamond on each corner of the border, where the printed lines meet. */
const FRAME_CORNERS = ['top-0 left-0', 'top-0 left-full', 'top-full left-0', 'top-full left-full'];

/**
 * Variant A (ა) — "Carte". The printed menu of a very good restaurant:
 * centred and symmetric, set in the serif, served course by course. Services
 * are the courses of an open menu, projects a wine list with dotted leaders,
 * the inquiry form a reservation card. It needs no photos to look finished;
 * a photo uploaded for the hero or a project takes its framed place.
 */
export async function VariantA({ locale, content }: VariantAProps) {
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

  return (
    <CarteMotion>
      <header
        data-enter
        className="absolute inset-x-0 top-0 z-(--z-raised) grid grid-cols-3 items-center gap-4 px-(--carte-edge) pt-(--carte-edge-top)"
      >
        <div className="max-sm:invisible">
          <CtaLink href={toInquiry} tone="text" className="text-body-sm">
            {ctaLabel}
          </CtaLink>
        </div>
        <Wordmark className="text-body-lg justify-self-center" />
        <div className="justify-self-end">
          <LanguageSwitcher />
        </div>
      </header>

      <main>
        {/* The first screen, inside the printed border. */}
        <section
          aria-labelledby="hero-heading"
          className="relative flex min-h-dvh flex-col items-center justify-center gap-9 px-(--carte-edge) pt-28 pb-24 text-center"
        >
          <div aria-hidden data-decorative className="absolute inset-(--carte-frame-inset)">
            {FRAME_LINES.map((line) => (
              <span
                key={`${line.inner}-${line.className}`}
                data-frame-line={line.axis}
                data-inner={line.inner ? '' : undefined}
                className={cn('carte-line', line.className)}
              />
            ))}
            {FRAME_CORNERS.map((corner) => (
              <span
                key={corner}
                data-frame-corner
                className={cn('carte-diamond absolute -translate-1/2', corner)}
              />
            ))}
          </div>

          <Ornament enter />
          <h1
            id="hero-heading"
            data-testid="hero-heading"
            data-enter
            data-ink
            className="font-display font-hero text-display max-w-5xl text-balance"
          >
            {section.hero?.heading || (
              <span className="text-ink-subtle">[no hero heading set]</span>
            )}
          </h1>
          {section.hero?.subheading ? (
            <p data-enter className="text-body-lg text-ink-muted max-w-xl text-pretty">
              {section.hero.subheading}
            </p>
          ) : null}
          <div data-enter className="pt-2">
            <CtaLink href={toInquiry} tone="outline" size="lg">
              {ctaLabel}
            </CtaLink>
          </div>
        </section>

        {section.hero?.media ? (
          <figure className="px-gutter pt-section">
            <div data-reveal className="carte-double max-w-page mx-auto p-2.5">
              <MediaFrame
                media={section.hero.media}
                ratio="16/9"
                sizes="(min-width: 1152px) 72rem, 100vw"
                missingLabel={t('preview.photoHero')}
              />
            </div>
          </figure>
        ) : null}

        {section.intro ? (
          <section id="about" aria-labelledby="about-title" className="px-gutter pt-section">
            <CourseHeading id="about-title" title={section.intro.heading || t('nav.about')} />
            <div data-reveal className="mx-auto mt-12 max-w-(--carte-measure)">
              {isBlankHtml(section.intro.body) ? (
                <PendingSlot label={t('preview.pendingIntro')} hint={t('preview.pendingHint')} />
              ) : (
                <RichText
                  html={section.intro.body}
                  className="carte-book text-body-lg text-ink-muted text-pretty"
                />
              )}
            </div>
            {section.intro.media ? (
              <div data-reveal className="carte-double mx-auto mt-16 max-w-4xl p-2.5">
                <MediaFrame
                  media={section.intro.media}
                  ratio="3/2"
                  sizes="(min-width: 896px) 56rem, 100vw"
                  missingLabel={t('preview.photoSection')}
                />
              </div>
            ) : null}
          </section>
        ) : null}

        {showServices ? (
          <section id="services" aria-labelledby="services-title" className="px-gutter pt-section">
            <CourseHeading
              id="services-title"
              title={section.services?.heading || t('nav.services')}
              note={section.services?.subheading}
            />
            {/* An open menu: the courses run down the left page, then the right. */}
            <ul className="carte-spread max-w-page mx-auto mt-14 gap-x-20 md:columns-2">
              {services.items.map((service) => (
                <li
                  key={service.id}
                  data-reveal
                  className="flex break-inside-avoid flex-col items-center py-10 text-center"
                >
                  <h3 className="font-display font-heading text-title text-balance">
                    {service.title}
                  </h3>
                  <span
                    aria-hidden
                    data-rule
                    className="bg-line-strong mt-5 block h-px w-(--carte-rule)"
                  />
                  {service.shortDescription ? (
                    <p className="text-body text-ink-muted mt-5 max-w-(--carte-course) text-pretty">
                      {service.shortDescription}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {showProjects ? (
          <section id="projects" aria-labelledby="projects-title" className="px-gutter pt-section">
            <CourseHeading
              id="projects-title"
              title={section.projects?.heading || t('nav.projects')}
              note={section.projects?.subheading}
            />
            {projects.items.length === 0 ? (
              <p className="text-body-lg text-ink-muted mt-10 text-center">
                {t('home.noProjects')}
              </p>
            ) : (
              // A wine list: the name, a dotted leader, the year; the details beneath.
              <ol data-testid="project-list" className="mx-auto mt-14 flex max-w-4xl flex-col">
                {projects.items.map((project) => {
                  const meta = joinMeta([project.client, project.location]);
                  return (
                    <li
                      key={project.id}
                      data-reveal
                      className="border-line flex gap-6 border-t py-8 last:border-b sm:gap-8"
                    >
                      {project.cover ? (
                        <MediaFrame
                          media={project.cover}
                          ratio="4/5"
                          sizes="6rem"
                          missingLabel={t('preview.photoProject')}
                          className="w-(--carte-thumb) shrink-0"
                        />
                      ) : null}
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex items-end gap-4">
                          <h3
                            data-testid="project-title"
                            className="font-display font-heading text-title-sm min-w-0 text-pretty"
                          >
                            {project.title}
                          </h3>
                          {project.year ? (
                            <>
                              <span
                                aria-hidden
                                data-leader
                                className="carte-leader mb-2 min-w-8 flex-1"
                              />
                              <span className="text-body text-ink-muted shrink-0 tabular-nums">
                                {project.year}
                              </span>
                            </>
                          ) : null}
                        </div>
                        {meta ? <p className="text-body-sm text-ink-subtle">{meta}</p> : null}
                        {project.summary ? (
                          <p className="text-body text-ink-muted max-w-2xl text-pretty">
                            {project.summary}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        ) : null}

        {section.why ? (
          <section id="why" aria-labelledby="why-title" className="px-gutter pt-section">
            <CourseHeading
              id="why-title"
              title={section.why.heading || t('home.why')}
              note={section.why.subheading}
            />
            <div data-reveal className="mx-auto mt-12 max-w-(--carte-measure)">
              {isBlankHtml(section.why.body) ? (
                <PendingSlot label={t('preview.pendingWhy')} hint={t('preview.pendingHint')} />
              ) : (
                <RichText
                  html={section.why.body}
                  className="font-display text-lead text-ink text-pretty"
                />
              )}
            </div>
          </section>
        ) : null}

        {showInsights ? (
          <section id="insights" aria-labelledby="insights-title" className="px-gutter pt-section">
            <CourseHeading
              id="insights-title"
              title={section.insights?.heading || t('nav.insights')}
            />
            {/* A three-column insert, divided by hairlines like a folded card. */}
            <ul className="border-line divide-line max-w-page mx-auto mt-14 grid divide-y border-y md:grid-cols-3 md:divide-x md:divide-y-0">
              {insights.items.map((insight) => (
                <li
                  key={insight.id}
                  data-reveal
                  className="flex flex-col items-center gap-3 px-6 py-10 text-center"
                >
                  <p className="text-body-sm text-ink-subtle">
                    {joinMeta([
                      insight.category?.name,
                      insight.publishedAt
                        ? format.dateTime(new Date(insight.publishedAt), { dateStyle: 'long' })
                        : null,
                    ])}
                  </p>
                  <h3 className="font-display font-heading text-title-sm text-balance">
                    {insight.title}
                  </h3>
                  {insight.excerpt ? (
                    <p className="text-body-sm text-ink-muted text-pretty">{insight.excerpt}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* The reservation card. */}
        <section
          id={INQUIRY_ANCHOR}
          aria-labelledby={`${INQUIRY_ANCHOR}-title`}
          className="px-gutter py-section"
        >
          <div
            data-reveal
            className="carte-double bg-surface-raised mx-auto max-w-3xl px-6 py-12 sm:px-14 sm:py-16"
          >
            <div className="flex flex-col items-center gap-6 text-center">
              <Ornament />
              <h2
                id={`${INQUIRY_ANCHOR}-title`}
                className="font-display font-heading text-headline text-balance"
              >
                {section.cta?.heading || t('contact.title')}
              </h2>
              {section.cta?.subheading ? (
                <p className="text-body-lg text-ink-muted text-pretty">{section.cta.subheading}</p>
              ) : null}
            </div>
            <div className="mt-12">
              <InquiryForm
                locale={locale}
                submitLabel={section.cta?.ctaLabel || undefined}
                layout="two-column"
              />
            </div>
            <div className="border-line mt-12 flex flex-col items-center gap-4 border-t pt-10 text-center">
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
        </section>
      </main>

      {/* The back of the menu. */}
      <footer className="px-gutter pb-12">
        <div className="border-line max-w-page mx-auto flex flex-col items-center gap-5 border-t pt-12 text-center">
          <Ornament />
          <Wordmark testId="footer-wordmark" className="text-body-lg" />
          {layout?.footerText ? (
            <p className="text-body-sm text-ink-muted max-w-md text-pretty">{layout.footerText}</p>
          ) : null}
          <p className="text-body-sm text-ink-subtle">
            © {new Date().getFullYear()} {layout?.siteName || 'STAGER'}
          </p>
        </div>
      </footer>
    </CarteMotion>
  );
}

/** Rule, diamond, rule: the one ornament, opening each course. */
function Ornament({ enter = false }: { enter?: boolean }) {
  return (
    <span
      aria-hidden
      data-decorative
      data-enter={enter ? '' : undefined}
      className="flex items-center gap-3"
    >
      <span data-rule className="bg-line-strong block h-px w-8" />
      <span className="carte-diamond" />
      <span data-rule className="bg-line-strong block h-px w-8" />
    </span>
  );
}

/** A section's heading, centred under the ornament like a course on a menu. */
function CourseHeading({ id, title, note }: { id: string; title: string; note?: string }) {
  return (
    <div data-reveal className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
      <Ornament />
      <h2 id={id} className="font-display font-heading text-headline text-balance">
        {title}
      </h2>
      {note ? <p className="text-body-lg text-ink-muted max-w-xl text-pretty">{note}</p> : null}
    </div>
  );
}
