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
import { cn } from '@/shared/lib/cn';
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
 * An insert's size within a tray. A tray is a Gastronorm 1/1 pan seen as a
 * 3 × 2 grid of sixths: a third is a full-height column, two thirds are two
 * columns, the full size is the whole tray.
 */
type Insert = 'full' | 'twoThirds' | 'third' | 'sixth';

/**
 * How a tray of one to six inserts divides so that every count fills it
 * exactly, largest first. A tray never has an empty insert.
 */
const TRAY: Record<number, readonly Insert[]> = {
  1: ['full'],
  2: ['twoThirds', 'third'],
  3: ['third', 'third', 'third'],
  4: ['third', 'third', 'sixth', 'sixth'],
  5: ['third', 'sixth', 'sixth', 'sixth', 'sixth'],
  6: ['sixth', 'sixth', 'sixth', 'sixth', 'sixth', 'sixth'],
};

/**
 * Where each size sits: one column on a phone, two from `sm` (anything larger
 * than a sixth takes the whole row), the 3 × 2 tray from `lg`.
 */
const INSERT_SPAN: Record<Insert, string> = {
  full: 'sm:col-span-2 lg:col-span-3 lg:row-span-2',
  twoThirds: 'sm:col-span-2 lg:row-span-2',
  third: 'sm:col-span-2 lg:col-span-1 lg:row-span-2',
  sixth: '',
};

/**
 * Six inserts to a tray at most. A longer list is shared across trays as
 * evenly as possible (seven becomes four and three), never six and a lone one.
 */
function toTrays<T>(items: readonly T[]): T[][] {
  const count = Math.ceil(items.length / 6);
  const trays: T[][] = [];
  let start = 0;
  for (let index = 0; index < count; index += 1) {
    const size = Math.ceil((items.length - start) / (count - index));
    trays.push(items.slice(start, start + size));
    start += size;
  }
  return trays;
}

/** The steel tray itself: its colour shows only as the rails between inserts. */
const TRAY_CLASS = 'bg-line grid gap-1.5 rounded-xl p-1.5';

/** Staggers the hero's inserts: each one starts a step after the last. */
const step = (index: number) => ({ '--i': index }) as CSSProperties;

/**
 * Variant A (ა) — "Station". Mise en place: every section sits in a steel
 * tray divided into inserts in real hotel-pan proportions, so the page reads
 * as a well-kept kitchen station. One insert per tray is teal. Photos fill
 * their inserts; until one is uploaded, the insert is hatched and labelled.
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
  const servicesTitle = whatWeDo?.heading || t('nav.services');
  const projectsTitle = selected?.heading || t('nav.projects');

  const navItems = [
    showServices ? { id: 'services', title: servicesTitle } : null,
    showProjects ? { id: 'projects', title: projectsTitle } : null,
    why ? { id: 'why', title: why.heading || t('home.why') } : null,
  ].filter((item) => item !== null);

  const [featured, ...moreProjects] = projects.items;

  return (
    <>
      <header className="max-w-page px-gutter mx-auto flex items-center justify-between gap-6 py-4">
        <Wordmark className="text-body-lg" />
        <nav aria-label={t('home.sections')} className="hidden lg:block">
          <ul className="flex items-center gap-8">
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
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <div className="hidden sm:block">
            <CtaLink href={`#${INQUIRY_ANCHOR}`}>{ctaLabel}</CtaLink>
          </div>
        </div>
      </header>

      <main>
        {/* The first tray: the message in a two-thirds insert, the photo in a third. */}
        <section className="max-w-page px-gutter mx-auto">
          <div className={cn(TRAY_CLASS, 'lg:min-h-144 lg:grid-cols-3')}>
            {/* The headline holds the top of the insert; what it means and what
                to do about it sit together at the bottom. */}
            <div
              style={step(0)}
              className="bg-surface-raised animate-rise stagger flex flex-col justify-between gap-12 rounded-lg p-6 sm:p-10 lg:col-span-2 lg:p-14"
            >
              <h1
                data-testid="hero-heading"
                className="text-display font-hero stretch-hero max-w-4xl text-balance"
              >
                {hero?.heading || <span className="text-ink-subtle">[no hero heading set]</span>}
              </h1>
              <div className="flex flex-col gap-8">
                {hero?.subheading ? (
                  <p className="text-lead text-ink-muted max-w-xl text-pretty">{hero.subheading}</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                  <CtaLink href={`#${INQUIRY_ANCHOR}`} size="lg" icon="down">
                    {ctaLabel}
                  </CtaLink>
                  {showProjects ? (
                    <CtaLink href="#projects" tone="text">
                      {projectsTitle}
                    </CtaLink>
                  ) : null}
                </div>
              </div>
            </div>
            <div style={step(1)} className="animate-rise stagger flex">
              <MediaFrame
                media={hero?.media ?? null}
                ratio="fill"
                priority
                sizes="(min-width: 1024px) 28rem, 100vw"
                missingLabel={t('preview.photoHero')}
                missingHint={t('preview.photoHint')}
                empty="hatched"
                className="aspect-4/3 rounded-lg lg:aspect-auto"
              />
            </div>
          </div>
        </section>

        {intro ? (
          <section
            id="about"
            aria-labelledby="about-title"
            className="max-w-page px-gutter pt-section mx-auto grid gap-8 lg:grid-cols-3 lg:gap-12"
          >
            <h2
              id="about-title"
              className="text-headline font-heading stretch-heading text-balance lg:col-span-1"
            >
              {intro.heading || t('nav.about')}
            </h2>
            <div className="flex flex-col gap-8 lg:col-span-2">
              {isBlankHtml(intro.body) ? (
                <PendingSlot label={t('preview.pendingIntro')} hint={t('preview.pendingHint')} />
              ) : (
                <RichText html={intro.body} className="text-lead max-w-3xl text-pretty" />
              )}
              {intro.media ? (
                <MediaFrame
                  media={intro.media}
                  ratio="16/9"
                  sizes="(min-width: 1024px) 50rem, 100vw"
                  missingLabel={t('preview.photoSection')}
                  className="rounded-xl"
                />
              ) : null}
            </div>
          </section>
        ) : null}

        {showServices ? (
          <section
            id="services"
            aria-labelledby="services-title"
            className="max-w-page px-gutter pt-section mx-auto"
          >
            <div className="flex max-w-2xl flex-col gap-4">
              <h2
                id="services-title"
                className="text-headline font-heading stretch-heading text-balance"
              >
                {servicesTitle}
              </h2>
              {whatWeDo?.subheading ? (
                <p className="text-body-lg text-ink-muted text-pretty">{whatWeDo.subheading}</p>
              ) : null}
            </div>

            <div className="mt-10 flex flex-col gap-1.5">
              {toTrays(services.items).map((tray) => {
                const sizes = TRAY[tray.length] ?? [];
                return (
                  <ul
                    key={tray[0]?.id}
                    className={cn(TRAY_CLASS, 'sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2')}
                  >
                    {tray.map((service, index) => {
                      const size = sizes[index] ?? 'sixth';
                      // The first insert of each tray is teal; in a fuller
                      // tray the last is tinted too, so no tray is all one colour.
                      const teal = index === 0;
                      const tinted = !teal && tray.length >= 4 && index === tray.length - 1;
                      return (
                        <li
                          key={service.id}
                          data-surface={teal ? 'inverse' : undefined}
                          className={cn(
                            'flex min-h-56 flex-col justify-between gap-8 rounded-lg p-6 sm:p-8 lg:min-h-64',
                            !teal && (tinted ? 'bg-surface-muted' : 'bg-surface-raised'),
                            INSERT_SPAN[size],
                          )}
                        >
                          {service.cover ? (
                            <MediaFrame
                              media={service.cover}
                              ratio="3/2"
                              sizes="(min-width: 1024px) 26rem, (min-width: 640px) 50vw, 100vw"
                              missingLabel={service.title}
                              className="rounded-md"
                            />
                          ) : hasServiceIcon(service.icon) ? (
                            <span className="bg-surface-muted text-title inline-flex size-14 items-center justify-center rounded-sm">
                              <ServiceIcon name={service.icon} />
                            </span>
                          ) : null}
                          <div className="flex flex-col gap-2">
                            <h3 className="text-title font-heading stretch-heading text-balance">
                              {service.title}
                            </h3>
                            {service.shortDescription ? (
                              <p className="text-body text-ink-muted max-w-md text-pretty">
                                {service.shortDescription}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                );
              })}
            </div>
          </section>
        ) : null}

        {showProjects ? (
          <section
            id="projects"
            aria-labelledby="projects-title"
            className="max-w-page px-gutter pt-section mx-auto"
          >
            <h2
              id="projects-title"
              className="text-headline font-heading stretch-heading text-balance"
            >
              {projectsTitle}
            </h2>
            {featured === undefined ? (
              <p className="text-body-lg text-ink-muted mt-6">{t('home.noProjects')}</p>
            ) : (
              <div data-testid="project-list" className="mt-10 flex flex-col gap-1.5">
                {/* The latest project: a wide pan for the photo, and a shallow
                    one beneath it for the story. */}
                <article className={TRAY_CLASS}>
                  <MediaFrame
                    media={featured.cover}
                    ratio="fill"
                    sizes="(min-width: 1344px) 82rem, 100vw"
                    missingLabel={t('preview.photoProject')}
                    missingHint={t('preview.photoHint')}
                    empty="hatched"
                    className="aspect-3/2 rounded-lg lg:aspect-auto lg:h-112"
                  />
                  <div className="bg-surface-raised grid gap-4 rounded-lg p-6 sm:p-10 lg:grid-cols-12 lg:gap-x-8">
                    <div className="flex flex-col gap-3 lg:col-span-5">
                      <ProjectMeta project={featured} />
                      <h3
                        data-testid="project-title"
                        className="text-title font-heading stretch-heading text-balance"
                      >
                        {featured.title}
                      </h3>
                    </div>
                    {featured.summary ? (
                      <p className="text-body-lg text-ink-muted max-w-2xl text-pretty lg:col-span-7 lg:self-end">
                        {featured.summary}
                      </p>
                    ) : null}
                  </div>
                </article>

                {/* The rest: one long, shallow insert each, like a row of 1/9 pans. */}
                {moreProjects.length > 0 ? (
                  <ul className={TRAY_CLASS}>
                    {moreProjects.map((project) => (
                      <li
                        key={project.id}
                        className="bg-surface-raised grid items-center gap-5 rounded-lg p-3 sm:grid-cols-4 sm:gap-8"
                      >
                        <MediaFrame
                          media={project.cover}
                          ratio="3/2"
                          sizes="(min-width: 640px) 18rem, 100vw"
                          missingLabel={t('preview.photoProject')}
                          empty="hatched"
                          className="rounded-md"
                        />
                        <div className="flex flex-col gap-2 px-3 pb-3 sm:col-span-3 sm:px-0 sm:pb-0">
                          <ProjectMeta project={project} />
                          <h3
                            data-testid="project-title"
                            className="text-title-sm font-heading stretch-heading"
                          >
                            {project.title}
                          </h3>
                          {project.summary ? (
                            <p className="text-body text-ink-muted max-w-2xl text-pretty">
                              {project.summary}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </section>
        ) : null}

        {why ? (
          <section
            id="why"
            aria-labelledby="why-title"
            className="max-w-page px-gutter pt-section mx-auto"
          >
            <div className="flex max-w-4xl flex-col gap-6">
              <h2
                id="why-title"
                className="text-headline font-heading stretch-heading text-balance"
              >
                {why.heading || t('home.why')}
              </h2>
              {why.subheading ? (
                <p className="text-lead text-ink-muted text-pretty">{why.subheading}</p>
              ) : null}
            </div>
            <div className="mt-10">
              {isBlankHtml(why.body) ? (
                <PendingSlot
                  label={t('preview.pendingWhy')}
                  hint={t('preview.pendingHint')}
                  className="max-w-4xl"
                />
              ) : (
                <RichText
                  html={why.body}
                  className="text-body-lg text-ink-muted max-w-5xl lg:columns-2 lg:gap-16"
                />
              )}
            </div>
          </section>
        ) : null}

        {showInsights ? (
          <section
            id="insights"
            aria-labelledby="insights-title"
            className="max-w-page px-gutter pt-section mx-auto"
          >
            <h2
              id="insights-title"
              className="text-headline font-heading stretch-heading text-balance"
            >
              {latest?.heading || t('nav.insights')}
            </h2>
            <ul className="mt-10 grid gap-x-12 lg:grid-cols-2">
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
                  <h3 className="text-title-sm font-heading stretch-heading">{insight.title}</h3>
                  {insight.excerpt ? (
                    <p className="text-body text-ink-muted max-w-xl text-pretty">
                      {insight.excerpt}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section
          id={INQUIRY_ANCHOR}
          aria-labelledby={`${INQUIRY_ANCHOR}-title`}
          className="max-w-page px-gutter py-section mx-auto"
        >
          <div className={cn(TRAY_CLASS, 'lg:grid-cols-3')}>
            <div
              data-surface="inverse"
              className="flex flex-col gap-8 rounded-lg p-6 sm:p-10 lg:col-span-1"
            >
              <div className="flex flex-col gap-4">
                <h2
                  id={`${INQUIRY_ANCHOR}-title`}
                  className="text-headline font-heading stretch-heading text-balance"
                >
                  {cta?.heading || t('contact.title')}
                </h2>
                {cta?.subheading ? (
                  <p className="text-body-lg text-ink-muted text-pretty">{cta.subheading}</p>
                ) : null}
              </div>
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
            <div className="bg-surface-raised rounded-lg p-6 sm:p-10 lg:col-span-2">
              <InquiryForm
                locale={locale}
                submitLabel={cta?.ctaLabel || undefined}
                layout="two-column"
              />
            </div>
          </div>
        </section>
      </main>

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
    </>
  );
}

/** Client, place and year: the line above a project's title. */
function ProjectMeta({ project }: { project: PublicProjectListItem }) {
  const meta = joinMeta([project.client, project.location, project.year]);
  return meta ? <p className="text-body-sm text-ink-subtle">{meta}</p> : null;
}
