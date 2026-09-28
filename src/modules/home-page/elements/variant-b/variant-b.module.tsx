import { getFormatter, getTranslations } from 'next-intl/server';
import { Fragment, type CSSProperties } from 'react';

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

type VariantBProps = {
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
 * After this many words the rest of a headline arrives together: a long
 * heading from the dashboard should not take seconds to finish appearing.
 */
const STAGGERED_WORDS = 8;

const step = (index: number) => ({ '--i': Math.min(index, STAGGERED_WORDS) }) as CSSProperties;

/**
 * The hero's one orchestrated moment: each word rises into place a step
 * after the one before. Words stay words for screen readers and wrapping;
 * under reduced motion they are simply there.
 */
function RisingWords({ text }: { text: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  return words.map((word, index) => (
    <Fragment key={index}>
      {index > 0 ? ' ' : null}
      <span style={step(index)} className="animate-rise stagger inline-block">
        {word}
      </span>
    </Fragment>
  ));
}

/**
 * Variant B (ბ) — "Mkhedruli". A monument in teal: the whole page on the
 * logo's colour, headlines in the typeface's extra-condensed black at poster
 * scale, so the letterforms are the image. Photos sit behind the type in fine
 * cream frames. The only motion that plays by itself is the headline rising
 * word by word; sections rise into view as they scroll in.
 */
export async function VariantB({ locale, content }: VariantBProps) {
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
        {/* The headline runs across the whole page, in front of the photo's
            frame; what it means and the call to action sit beneath it. */}
        <section className="max-w-page px-gutter pb-section mx-auto grid gap-y-10 pt-8 lg:grid-cols-12 lg:gap-x-6 lg:pt-14">
          <h1
            data-testid="hero-heading"
            className="text-display font-hero stretch-hero relative z-10 text-balance lg:col-span-11 lg:col-start-1 lg:row-start-1"
          >
            {hero?.heading ? (
              <RisingWords text={hero.heading} />
            ) : (
              <span className="text-ink-subtle">[no hero heading set]</span>
            )}
          </h1>
          <div className="relative z-10 flex flex-col items-start gap-8 lg:col-span-5 lg:col-start-1 lg:row-start-2 lg:self-end">
            {hero?.subheading ? (
              <p className="text-lead text-ink-muted max-w-md text-pretty">{hero.subheading}</p>
            ) : null}
            <CtaLink href={`#${INQUIRY_ANCHOR}`} size="lg" icon="down">
              {ctaLabel}
            </CtaLink>
          </div>
          <div className="relative lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1">
            <MediaFrame
              media={hero?.media ?? null}
              ratio="fill"
              priority
              sizes="(min-width: 1024px) 34rem, 100vw"
              missingLabel={t('preview.photoHero')}
              missingHint={t('preview.photoHint')}
              empty="outlined"
              className="aspect-4/5 rounded-sm lg:aspect-auto lg:h-full"
            />
            {/* Where the headline crosses a photo, the teal deepens so the
                letters stay readable over any picture. */}
            {hero?.media ? (
              <div
                aria-hidden
                className="from-surface/80 absolute inset-0 hidden rounded-sm bg-linear-to-r to-transparent lg:block"
              />
            ) : null}
          </div>
        </section>

        {intro ? (
          <section
            id="about"
            aria-labelledby="about-title"
            className="max-w-page px-gutter pb-section mx-auto grid gap-10 lg:grid-cols-12 lg:gap-x-6"
          >
            <div className="flex flex-col gap-8 lg:col-span-7">
              <h2
                id="about-title"
                className="text-headline font-heading stretch-heading reveal text-balance"
              >
                {intro.heading || t('nav.about')}
              </h2>
              {isBlankHtml(intro.body) ? (
                <PendingSlot label={t('preview.pendingIntro')} hint={t('preview.pendingHint')} />
              ) : (
                <RichText html={intro.body} className="text-lead text-ink-muted text-pretty" />
              )}
            </div>
            {intro.media ? (
              <MediaFrame
                media={intro.media}
                ratio="4/5"
                sizes="(min-width: 1024px) 30rem, 100vw"
                missingLabel={t('preview.photoSection')}
                empty="outlined"
                className="rounded-sm lg:col-span-4 lg:col-start-9"
              />
            ) : null}
          </section>
        ) : null}

        {showServices ? (
          <section
            id="services"
            aria-labelledby="services-title"
            className="max-w-page px-gutter pb-section mx-auto"
          >
            <div className="flex max-w-3xl flex-col gap-4">
              <h2
                id="services-title"
                className="text-headline font-heading stretch-heading reveal text-balance"
              >
                {servicesTitle}
              </h2>
              {whatWeDo?.subheading ? (
                <p className="text-body-lg text-ink-muted text-pretty">{whatWeDo.subheading}</p>
              ) : null}
            </div>
            {/* An index, read top to bottom: each discipline's name at poster
                scale, what it covers beside it. */}
            <ul className="mt-12">
              {services.items.map((service) => (
                <li
                  key={service.id}
                  className="border-line reveal grid gap-4 border-t py-8 lg:grid-cols-12 lg:items-baseline lg:gap-x-6 lg:py-10"
                >
                  <h3 className="text-headline font-heading stretch-heading text-balance lg:col-span-7">
                    {service.title}
                  </h3>
                  <div className="flex items-start gap-5 lg:col-span-5">
                    {hasServiceIcon(service.icon) ? (
                      <span className="text-title text-ink-muted mt-1 shrink-0">
                        <ServiceIcon name={service.icon} weight="thin" />
                      </span>
                    ) : null}
                    {service.shortDescription ? (
                      <p className="text-body-lg text-ink-muted text-pretty">
                        {service.shortDescription}
                      </p>
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
              className="text-headline font-heading stretch-heading reveal text-balance"
            >
              {projectsTitle}
            </h2>
            {featured === undefined ? (
              <p className="text-body-lg text-ink-muted mt-6">{t('home.noProjects')}</p>
            ) : (
              <div data-testid="project-list" className="mt-12 flex flex-col gap-16">
                <article className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-x-6">
                  <MediaFrame
                    media={featured.cover}
                    ratio="4/5"
                    sizes="(min-width: 1024px) 34rem, 100vw"
                    missingLabel={t('preview.photoProject')}
                    missingHint={t('preview.photoHint')}
                    empty="outlined"
                    className="rounded-sm lg:col-span-5"
                  />
                  <div className="flex flex-col gap-5 lg:col-span-6 lg:col-start-7">
                    <ProjectMeta project={featured} />
                    <h3
                      data-testid="project-title"
                      className="text-headline font-heading stretch-heading text-balance"
                    >
                      {featured.title}
                    </h3>
                    {featured.summary ? (
                      <p className="text-body-lg text-ink-muted max-w-xl text-pretty">
                        {featured.summary}
                      </p>
                    ) : null}
                  </div>
                </article>

                {/* The rest, side by side: a strip that scrolls sideways on
                    a phone and fits the width on a desktop. */}
                {moreProjects.length > 0 ? (
                  <ul className="-mx-gutter px-gutter flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0">
                    {moreProjects.map((project) => (
                      <li
                        key={project.id}
                        className="flex w-4/5 shrink-0 snap-start flex-col gap-4 sm:w-2/5 lg:w-auto"
                      >
                        <MediaFrame
                          media={project.cover}
                          ratio="4/5"
                          sizes="(min-width: 1024px) 26rem, 80vw"
                          missingLabel={t('preview.photoProject')}
                          empty="outlined"
                          className="rounded-sm"
                        />
                        <ProjectMeta project={project} />
                        <h3
                          data-testid="project-title"
                          className="text-title font-heading stretch-heading text-balance"
                        >
                          {project.title}
                        </h3>
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
            className="max-w-page px-gutter pb-section mx-auto"
          >
            <div className="border-line-strong grid gap-10 border-t pt-10 lg:grid-cols-12 lg:gap-x-6">
              <div className="flex flex-col gap-6 lg:col-span-5">
                <h2
                  id="why-title"
                  className="text-headline font-heading stretch-heading reveal text-balance"
                >
                  {why.heading || t('home.why')}
                </h2>
                {why.subheading ? (
                  <p className="text-lead text-ink-muted text-pretty">{why.subheading}</p>
                ) : null}
              </div>
              <div className="lg:col-span-6 lg:col-start-7">
                {isBlankHtml(why.body) ? (
                  <PendingSlot label={t('preview.pendingWhy')} hint={t('preview.pendingHint')} />
                ) : (
                  <RichText html={why.body} className="text-body-lg text-ink-muted" />
                )}
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
              className="text-headline font-heading stretch-heading reveal text-balance"
            >
              {latest?.heading || t('nav.insights')}
            </h2>
            <ul className="mt-12">
              {insights.items.map((insight) => (
                <li
                  key={insight.id}
                  className="border-line reveal grid gap-3 border-t py-6 lg:grid-cols-12 lg:items-baseline lg:gap-x-6"
                >
                  <p className="text-body-sm text-ink-subtle lg:col-span-3">
                    {joinMeta([
                      insight.category?.name,
                      insight.publishedAt
                        ? format.dateTime(new Date(insight.publishedAt), { dateStyle: 'long' })
                        : null,
                    ])}
                  </p>
                  <div className="flex flex-col gap-2 lg:col-span-8">
                    <h3 className="text-title font-heading stretch-heading">{insight.title}</h3>
                    {insight.excerpt ? (
                      <p className="text-body text-ink-muted max-w-2xl text-pretty">
                        {insight.excerpt}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section
          id={INQUIRY_ANCHOR}
          aria-labelledby={`${INQUIRY_ANCHOR}-title`}
          className="max-w-page px-gutter pb-section mx-auto"
        >
          <div className="border-line-strong grid gap-12 border-t pt-10 lg:grid-cols-12 lg:gap-x-6">
            <div className="flex flex-col gap-8 lg:col-span-5">
              <h2
                id={`${INQUIRY_ANCHOR}-title`}
                className="text-headline font-heading stretch-heading reveal text-balance"
              >
                {cta?.heading || t('contact.title')}
              </h2>
              {cta?.subheading ? (
                <p className="text-body-lg text-ink-muted text-pretty">{cta.subheading}</p>
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
                submitLabel={cta?.ctaLabel || undefined}
                layout="two-column"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-surface-inset">
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
    </>
  );
}

/** Client, place and year: the line above a project's title. */
function ProjectMeta({ project }: { project: PublicProjectListItem }) {
  const meta = joinMeta([project.client, project.location, project.year]);
  return meta ? <p className="text-body-sm text-ink-subtle">{meta}</p> : null;
}
