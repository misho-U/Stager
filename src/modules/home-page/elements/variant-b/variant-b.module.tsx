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
 * Column spans on the six-column grid that fill every row exactly: as many
 * rows of three (2+2+2) as fit, the rest in rows of two (3+3), pairs first.
 * Five services give 3,3 over 2,2,2 — no orphan cell whatever the count.
 */
function bentoSpans(count: number): string[] {
  if (count <= 1) return ['lg:col-span-6'];
  let triples = Math.floor(count / 3);
  while ((count - triples * 3) % 2 !== 0) triples -= 1;
  const pairs = (count - triples * 3) / 2;
  return [
    ...Array<string>(pairs * 2).fill('lg:col-span-3'),
    ...Array<string>(triples * 3).fill('lg:col-span-2'),
  ];
}

/** An odd last item takes the whole row of a two-column grid. */
const isOddLast = (index: number, count: number) => count % 2 === 1 && index === count - 1;

/**
 * Variant B (ბ) — "Studio". Photo-led and soft: a split hero with a portrait
 * photo, the intro as a card over a wide photo, white and tinted cards on
 * cream, services as a bento grid, one teal band. Until photos are uploaded,
 * labelled empty frames hold their places.
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

  const spans = bentoSpans(services.items.length);

  return (
    <>
      <header className="max-w-page px-gutter mx-auto flex items-center justify-between gap-4 py-3">
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
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <div className="hidden sm:block">
            <CtaLink href={`#${INQUIRY_ANCHOR}`}>{ctaLabel}</CtaLink>
          </div>
        </div>
      </header>

      <main>
        <section className="max-w-page px-gutter pb-section mx-auto grid items-center gap-10 pt-6 md:pt-10 lg:grid-cols-12 lg:gap-12">
          <div className="flex flex-col items-start gap-6 lg:col-span-7">
            <h1 data-testid="hero-heading" className="text-display font-hero text-balance">
              {hero?.heading || <span className="text-ink-subtle">[no hero heading set]</span>}
            </h1>
            {hero?.subheading ? (
              <p className="text-lead text-ink-muted max-w-xl">{hero.subheading}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2">
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
          <MediaFrame
            media={hero?.media ?? null}
            ratio="4/5"
            priority
            sizes="(min-width: 1024px) 28rem, 100vw"
            missingLabel={t('preview.photoHero')}
            missingHint={t('preview.photoHint')}
            className="rounded-lg lg:col-span-5"
          />
        </section>

        {intro ? (
          <section
            id="about"
            aria-labelledby="about-title"
            className="max-w-page px-gutter pb-section mx-auto"
          >
            <MediaFrame
              media={intro.media}
              ratio="16/9"
              sizes="(min-width: 1184px) 70rem, 100vw"
              missingLabel={t('preview.photoSection')}
              missingHint={t('preview.photoHint')}
              className="rounded-lg"
            />
            {/* Overlaps the photo but stays in the flow, so a long text
                grows the card downwards instead of spilling over the photo. */}
            <div className="bg-surface-raised shadow-card relative mx-4 -mt-8 flex max-w-2xl flex-col gap-6 rounded-lg p-6 sm:mx-8 sm:-mt-16 sm:p-10 lg:-mt-40 lg:ml-12">
              <h2 id="about-title" className="text-headline font-heading text-balance">
                {intro.heading || t('nav.about')}
              </h2>
              {isBlankHtml(intro.body) ? (
                <PendingSlot label={t('preview.pendingIntro')} hint={t('preview.pendingHint')} />
              ) : (
                <RichText html={intro.body} className="text-lead text-ink-muted" />
              )}
            </div>
          </section>
        ) : null}

        {showServices ? (
          <section
            id="services"
            aria-labelledby="services-title"
            className="max-w-page px-gutter pb-section mx-auto"
          >
            <div className="flex max-w-2xl flex-col gap-4">
              <h2 id="services-title" className="text-headline font-heading text-balance">
                {servicesTitle}
              </h2>
              {whatWeDo?.subheading ? (
                <p className="text-body-lg text-ink-muted">{whatWeDo.subheading}</p>
              ) : null}
            </div>
            <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              {services.items.map((service, index) => {
                const last = index === services.items.length - 1;
                // Three kinds of cell: teal first, a cool tint last, white between.
                const tone = index === 0 ? 'teal' : last && index > 1 ? 'tint' : 'white';
                return (
                  <li
                    key={service.id}
                    data-surface={tone === 'teal' ? 'inverse' : undefined}
                    className={cn(
                      'flex flex-col gap-4 rounded-lg p-6 sm:p-8',
                      tone === 'white' && 'bg-surface-raised',
                      tone === 'tint' && 'bg-surface-muted',
                      isOddLast(index, services.items.length) && 'md:col-span-2',
                      spans[index],
                    )}
                  >
                    {service.cover ? (
                      <MediaFrame
                        media={service.cover}
                        ratio="3/2"
                        sizes="(min-width: 1024px) 34rem, (min-width: 768px) 50vw, 100vw"
                        missingLabel={service.title}
                        className="mb-2 rounded-md"
                      />
                    ) : hasServiceIcon(service.icon) ? (
                      <span className="bg-primary text-title text-on-primary inline-flex size-12 items-center justify-center rounded-md">
                        <ServiceIcon name={service.icon} />
                      </span>
                    ) : null}
                    <h3 className="text-title-sm font-heading">{service.title}</h3>
                    {service.shortDescription ? (
                      <p className="text-body text-ink-muted">{service.shortDescription}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {showProjects ? (
          <section
            id="projects"
            aria-labelledby="projects-title"
            className="max-w-page px-gutter pb-section mx-auto"
          >
            <h2 id="projects-title" className="text-headline font-heading text-balance">
              {projectsTitle}
            </h2>
            {projects.items.length === 0 ? (
              <p className="text-body-lg text-ink-muted mt-6">{t('home.noProjects')}</p>
            ) : (
              <ul data-testid="project-list" className="mt-10 grid gap-6 md:grid-cols-2">
                {projects.items.map((project, index) => {
                  const featured = index === 0;
                  const meta = joinMeta([project.client, project.location, project.year]);
                  return (
                    <li
                      key={project.id}
                      className={cn(
                        'bg-surface-raised shadow-card grid gap-5 rounded-lg p-3 sm:p-4',
                        featured && 'md:col-span-2 lg:grid-cols-12 lg:items-center lg:gap-10',
                      )}
                    >
                      <MediaFrame
                        media={project.cover}
                        ratio={featured ? '16/9' : '3/2'}
                        sizes={
                          featured
                            ? '(min-width: 1024px) 40rem, 100vw'
                            : '(min-width: 768px) 50vw, 100vw'
                        }
                        missingLabel={t('preview.photoProject')}
                        missingHint={t('preview.photoHint')}
                        className={cn('rounded-md', featured && 'lg:col-span-7')}
                      />
                      <div
                        className={cn(
                          'flex flex-col gap-3 px-3 pb-4 sm:px-4',
                          featured && 'lg:col-span-5 lg:py-6 lg:pr-8',
                        )}
                      >
                        {meta ? <p className="text-body-sm text-ink-subtle">{meta}</p> : null}
                        <h3
                          data-testid="project-title"
                          className={cn('font-heading', featured ? 'text-title' : 'text-title-sm')}
                        >
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
            )}
          </section>
        ) : null}

        {why ? (
          <section
            id="why"
            aria-labelledby="why-title"
            className="max-w-page px-gutter pb-section mx-auto"
          >
            <div
              data-surface="inverse"
              className="grid gap-8 rounded-lg p-6 sm:p-10 lg:grid-cols-12 lg:gap-12 lg:p-16"
            >
              <h2 id="why-title" className="text-headline font-heading text-balance lg:col-span-5">
                {why.heading || t('home.why')}
              </h2>
              <div className="flex flex-col gap-6 lg:col-span-7">
                {why.subheading ? <p className="text-lead">{why.subheading}</p> : null}
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
            <h2 id="insights-title" className="text-headline font-heading text-balance">
              {latest?.heading || t('nav.insights')}
            </h2>
            <ul className="mt-10 grid gap-6 md:grid-cols-2">
              {insights.items.map((insight, index) => (
                <li
                  key={insight.id}
                  className={cn(
                    'bg-surface-raised shadow-card flex flex-col gap-4 rounded-lg p-3',
                    isOddLast(index, insights.items.length) && 'md:col-span-2',
                  )}
                >
                  {insight.cover ? (
                    <MediaFrame
                      media={insight.cover}
                      ratio="3/2"
                      sizes="(min-width: 768px) 50vw, 100vw"
                      missingLabel={insight.title}
                      className="rounded-md"
                    />
                  ) : null}
                  <div className="flex flex-col gap-2 px-3 pt-2 pb-4">
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
                      <p className="text-body text-ink-muted">{insight.excerpt}</p>
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
          <div className="bg-surface-raised shadow-card grid gap-10 rounded-lg p-6 sm:p-10 lg:grid-cols-12 lg:gap-12 lg:p-14">
            <div className="flex flex-col gap-6 lg:col-span-4">
              <h2
                id={`${INQUIRY_ANCHOR}-title`}
                className="text-headline font-heading text-balance"
              >
                {cta?.heading || t('contact.title')}
              </h2>
              {cta?.subheading ? (
                <p className="text-body-lg text-ink-muted">{cta.subheading}</p>
              ) : null}
              <div className="border-line flex flex-col gap-3 border-t pt-6">
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
                submitLabel={cta?.ctaLabel || undefined}
                layout="two-column"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="max-w-page px-gutter mx-auto pb-8">
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
