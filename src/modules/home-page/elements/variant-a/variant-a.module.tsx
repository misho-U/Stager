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

type Chapter = { id: string; title: string };

/**
 * Variant A (ა) — "Editorial". Text-led: the page reads as a sequence of
 * numbered chapters on ruled lines, with a contents list under the headline.
 * It never shows an empty photo frame, so it can be judged before any photo
 * exists; a project photo appears beside its entry once one is uploaded.
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

  const chapters = [
    intro ? { id: 'about', title: intro.heading || t('nav.about') } : null,
    showServices ? { id: 'services', title: whatWeDo?.heading || t('nav.services') } : null,
    showProjects ? { id: 'projects', title: selected?.heading || t('nav.projects') } : null,
    why ? { id: 'why', title: why.heading || t('home.why') } : null,
    showInsights ? { id: 'insights', title: latest?.heading || t('nav.insights') } : null,
    { id: INQUIRY_ANCHOR, title: cta?.heading || t('contact.title') },
  ].filter((chapter): chapter is Chapter => chapter !== null);

  const numberOf = (id: string) =>
    String(chapters.findIndex((chapter) => chapter.id === id) + 1).padStart(2, '0');
  const titleOf = (id: string) => chapters.find((chapter) => chapter.id === id)?.title ?? '';

  return (
    <>
      <header className="max-w-page px-gutter mx-auto flex items-center justify-between gap-6 py-3">
        <Wordmark className="text-body-lg" />
        <div className="flex items-center gap-6">
          <a
            href={`#${INQUIRY_ANCHOR}`}
            className="text-body-sm decoration-line-strong hover:decoration-ink hidden min-h-11 items-center underline underline-offset-8 transition-colors sm:inline-flex"
          >
            {ctaLabel}
          </a>
          <LanguageSwitcher />
        </div>
      </header>

      <main>
        <section className="max-w-page px-gutter pb-section mx-auto pt-10 md:pt-20">
          <h1 data-testid="hero-heading" className="text-display font-hero max-w-5xl text-balance">
            {hero?.heading || <span className="text-ink-subtle">[no hero heading set]</span>}
          </h1>

          <div className="mt-10 grid gap-8 md:mt-14 md:grid-cols-12 md:items-end md:gap-x-8">
            {hero?.subheading ? (
              <p className="text-lead text-ink-muted md:col-span-7">{hero.subheading}</p>
            ) : null}
            <div className="md:col-span-4 md:col-start-9 md:justify-self-end">
              <CtaLink href={`#${INQUIRY_ANCHOR}`} size="lg" icon="down">
                {ctaLabel}
              </CtaLink>
            </div>
          </div>

          <nav aria-label={t('home.sections')} className="mt-16 md:mt-24">
            <ol className="border-line-strong grid border-t sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3">
              {chapters.map((chapter) => (
                <li key={chapter.id} className="border-line border-b">
                  <a
                    href={`#${chapter.id}`}
                    className="hover:text-ink-muted flex min-h-11 items-baseline gap-4 py-4 transition-colors"
                  >
                    <span className="text-body-sm text-ink-subtle tabular-nums">
                      {numberOf(chapter.id)}
                    </span>
                    <span className="text-body-lg">{chapter.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </section>

        {intro ? (
          <Chapter id="about" number={numberOf('about')} title={titleOf('about')}>
            {isBlankHtml(intro.body) ? (
              <PendingSlot
                label={t('preview.pendingIntro')}
                hint={t('preview.pendingHint')}
                className="mt-8"
              />
            ) : (
              <RichText html={intro.body} className="text-lead mt-8 max-w-3xl" />
            )}
          </Chapter>
        ) : null}

        {showServices ? (
          <Chapter id="services" number={numberOf('services')} title={titleOf('services')}>
            {whatWeDo?.subheading ? (
              <p className="text-lead text-ink-muted mt-6 max-w-2xl">{whatWeDo.subheading}</p>
            ) : null}
            <ol className="border-line mt-10 border-t">
              {services.items.map((service) => (
                <li
                  key={service.id}
                  className="border-line grid gap-2 border-b py-7 md:grid-cols-10 md:gap-8"
                >
                  <h3 className="text-title font-heading md:col-span-4">{service.title}</h3>
                  {service.shortDescription ? (
                    <p className="text-body-lg text-ink-muted md:col-span-6">
                      {service.shortDescription}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </Chapter>
        ) : null}

        {showProjects ? (
          <Chapter id="projects" number={numberOf('projects')} title={titleOf('projects')}>
            {projects.items.length === 0 ? (
              <p className="text-body-lg text-ink-muted mt-8">{t('home.noProjects')}</p>
            ) : (
              <ul data-testid="project-list" className="border-line mt-10 border-t">
                {projects.items.map((project) => {
                  const meta = joinMeta([project.client, project.location, project.year]);
                  return (
                    <li
                      key={project.id}
                      className="border-line grid gap-6 border-b py-8 md:grid-cols-10 md:gap-8"
                    >
                      <div className="flex flex-col gap-3 md:col-span-6">
                        <h3 data-testid="project-title" className="text-title font-heading">
                          {project.title}
                        </h3>
                        {meta ? <p className="text-body-sm text-ink-subtle">{meta}</p> : null}
                        {project.summary ? (
                          <p className="text-body-lg text-ink-muted max-w-2xl">{project.summary}</p>
                        ) : null}
                      </div>
                      {project.cover ? (
                        <MediaFrame
                          media={project.cover}
                          ratio="3/2"
                          sizes="(min-width: 768px) 30vw, 100vw"
                          missingLabel={t('preview.photoProject')}
                          className="md:col-span-4"
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
          <Chapter id="why" number={numberOf('why')} title={titleOf('why')}>
            {why.subheading ? (
              <p className="text-headline font-hero mt-8 max-w-4xl text-balance">
                {why.subheading}
              </p>
            ) : null}
            {isBlankHtml(why.body) ? (
              <PendingSlot
                label={t('preview.pendingWhy')}
                hint={t('preview.pendingHint')}
                className="mt-8"
              />
            ) : (
              <RichText html={why.body} className="text-body-lg mt-8 md:columns-2 md:gap-x-12" />
            )}
          </Chapter>
        ) : null}

        {showInsights ? (
          <Chapter id="insights" number={numberOf('insights')} title={titleOf('insights')}>
            <ul className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
              {insights.items.map((insight) => (
                <li key={insight.id} className="border-line flex flex-col gap-3 border-t pt-5">
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
                </li>
              ))}
            </ul>
          </Chapter>
        ) : null}

        <Chapter
          id={INQUIRY_ANCHOR}
          number={numberOf(INQUIRY_ANCHOR)}
          title={titleOf(INQUIRY_ANCHOR)}
        >
          <div className="mt-8 grid gap-12 lg:grid-cols-10 lg:gap-8">
            <div className="flex flex-col gap-8 lg:col-span-4">
              {cta?.subheading ? (
                <p className="text-lead text-ink-muted">{cta.subheading}</p>
              ) : null}
              <div className="flex flex-col gap-3">
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
            <div className="lg:col-span-6">
              <InquiryForm locale={locale} submitLabel={cta?.ctaLabel || undefined} />
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
 * One numbered chapter: a heavy rule, the number in the margin column and the
 * heading beside it, with the chapter's content under the heading.
 */
function Chapter({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="max-w-page px-gutter pb-section mx-auto"
    >
      <div className="border-line-strong grid gap-y-4 border-t pt-5 md:grid-cols-12 md:gap-x-8">
        <p className="text-body-sm text-ink-subtle tabular-nums md:col-span-2">{number}</p>
        <div className="md:col-span-10">
          <h2 id={`${id}-title`} className="text-headline font-heading text-balance">
            {title}
          </h2>
          {children}
        </div>
      </div>
    </section>
  );
}
