import { getFormatter, getTranslations } from 'next-intl/server';
import type { CSSProperties, ReactNode } from 'react';

import type { PublicInsightListItem } from '@/entity/insight/model/insight.model';
import { homeSections, type PublicPage } from '@/entity/page/model/page.model';
import type { PublicProjectListItem } from '@/entity/project/model/project.model';
import type { PublicService } from '@/entity/service/model/service.model';
import type { PublicLayoutData } from '@/entity/site-setting/model/site-setting.model';
import { BlueprintMotion } from '@/modules/home-page/elements/variant-b/elements/blueprint-motion/blueprint-motion.module';
import {
  DOOR_CORNERS,
  PLANS,
  toFloors,
  ZONES_X,
  ZONES_Y,
} from '@/modules/home-page/elements/variant-b/variant-b.constants';
import { ContactDetails } from '@/shared/components/contact-details';
import { CtaLink } from '@/shared/components/cta-link';
import { MediaFrame } from '@/shared/components/media-frame';
import { PendingSlot } from '@/shared/components/pending-slot';
import { RichText } from '@/shared/components/rich-text';
import { hasServiceIcon, ServiceIcon } from '@/shared/components/service-icon';
import { SocialLinks } from '@/shared/components/social-links';
import { Wordmark } from '@/shared/components/wordmark';
import { cn } from '@/shared/lib/cn';
import { isBlankHtml } from '@/shared/lib/content';
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

/** Two-digit sheet numbers, as a drawing set numbers them. */
const sheetNo = (index: number) => String(index).padStart(2, '0');

/**
 * Variant B (ბ) — "Blueprint". A kitchen is drawn before it is built: every
 * section is a sheet on graph paper, with zone markers and a title block; the
 * headline is plotted, the services are the rooms of a floor plan, the
 * projects a drawing register, and the inquiry form the final blueprint. A
 * precision crosshair follows the pointer.
 */
export async function VariantB({ locale, content }: VariantBProps) {
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

  // The drawing set: every sheet that is shown, numbered in order.
  const sheets = [
    'hero',
    section.intro ? 'about' : null,
    showServices ? 'services' : null,
    showProjects ? 'projects' : null,
    section.why ? 'why' : null,
    showInsights ? 'insights' : null,
    INQUIRY_ANCHOR,
  ].filter((sheet) => sheet !== null);
  const numberOf = (id: string) => sheetNo(sheets.indexOf(id) + 1);
  const total = sheetNo(sheets.length);

  const navItems = [
    showServices ? { id: 'services', title: servicesTitle } : null,
    showProjects ? { id: 'projects', title: projectsTitle } : null,
    section.why ? { id: 'why', title: whyTitle } : null,
  ].filter((item) => item !== null);

  return (
    <BlueprintMotion>
      <div className="relative">
        {/* The graph paper under every sheet. */}
        <div aria-hidden data-decorative data-grid className="bp-grid absolute inset-0" />

        <div className="relative">
          <header
            data-enter
            className="max-w-page px-gutter relative mx-auto flex items-center justify-between gap-6 py-4"
          >
            <Wordmark className="text-body-lg" />
            <nav aria-label={t('home.sections')} className="hidden lg:block">
              <ul className="flex items-center gap-7">
                {navItems.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      data-snap
                      className="text-body-sm text-ink-muted hover:text-ink stretch-heading inline-flex min-h-11 items-center gap-2 whitespace-nowrap transition-colors"
                    >
                      <span className="text-ink-subtle tabular-nums">{numberOf(item.id)}</span>
                      {item.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <div className="hidden sm:block">
                <CtaLink href={toInquiry} tone="outline" className="bp-stamp stretch-heading">
                  {ctaLabel}
                </CtaLink>
              </div>
            </div>
          </header>

          <main>
            {/* Sheet 01: the headline, plotted. */}
            <section aria-labelledby="hero-heading" className="px-gutter">
              <div data-sheet className="max-w-page relative mx-auto">
                <SheetFrame number={numberOf('hero')} total={total} />
                <div className="relative flex min-h-(--bp-hero-min) flex-col pt-(--bp-zone-band) md:pl-(--bp-zone-band)">
                  {/* Centre lines through the sheet, as every drawing starts. */}
                  <span
                    aria-hidden
                    data-decorative
                    data-construction="x"
                    className="bp-axis-x absolute inset-x-0 top-3/4 h-px"
                  />
                  <span
                    aria-hidden
                    data-decorative
                    data-construction="y"
                    className="bp-axis-y absolute inset-y-0 left-2/3 hidden w-px md:block"
                  />

                  <div className="relative flex flex-1 flex-col justify-center gap-10 px-5 py-14 sm:px-10 lg:px-16">
                    <div className="relative w-fit max-w-5xl pt-8">
                      <DimensionLine fitsHeadline className="top-0 left-0 w-full" />
                      <h1
                        id="hero-heading"
                        data-testid="hero-heading"
                        data-enter
                        data-plot
                        className="text-display font-hero stretch-hero text-balance"
                      >
                        {section.hero?.heading || (
                          <span className="text-ink-subtle">[no hero heading set]</span>
                        )}
                      </h1>
                    </div>

                    {section.hero?.subheading ? <Callout>{section.hero.subheading}</Callout> : null}

                    <div data-enter data-stamp data-snap className="w-fit">
                      <CtaLink
                        href={toInquiry}
                        tone="outline"
                        size="lg"
                        className="bp-stamp stretch-heading"
                      >
                        {ctaLabel}
                      </CtaLink>
                    </div>
                  </div>

                  <div className="relative flex justify-end p-4 sm:p-6">
                    <TitleBlock
                      number={numberOf('hero')}
                      total={total}
                      locale={locale}
                      year={new Date().getFullYear()}
                    />
                  </div>
                </div>

                {section.hero?.media ? (
                  <div className="px-5 pb-10 sm:px-10 md:pl-(--bp-zone-band) lg:px-16">
                    <CropMarked>
                      <MediaFrame
                        media={section.hero.media}
                        ratio="16/9"
                        sizes="(min-width: 1312px) 76rem, 100vw"
                        missingLabel={t('preview.photoHero')}
                      />
                    </CropMarked>
                  </div>
                ) : null}
              </div>
            </section>

            {section.intro ? (
              <Sheet
                id="about"
                number={numberOf('about')}
                total={total}
                title={section.intro.heading || t('nav.about')}
              >
                {/* General notes: a boxed block of text, set in columns. */}
                <div data-reveal className="border-ink bg-surface mt-10 border p-6 sm:p-10">
                  {isBlankHtml(section.intro.body) ? (
                    <PendingSlot
                      label={t('preview.pendingIntro')}
                      hint={t('preview.pendingHint')}
                    />
                  ) : (
                    <RichText
                      html={section.intro.body}
                      className="text-body-lg text-ink-muted text-pretty lg:columns-2 lg:gap-14"
                    />
                  )}
                </div>
              </Sheet>
            ) : null}

            {showServices ? (
              <Sheet
                id="services"
                number={numberOf('services')}
                total={total}
                title={servicesTitle}
                note={section.services?.subheading}
              >
                {toFloors(services.items).map((floor) => (
                  <FloorPlan key={floor[0]?.id} rooms={floor} />
                ))}
              </Sheet>
            ) : null}

            {showProjects ? (
              <Sheet
                id="projects"
                number={numberOf('projects')}
                total={total}
                title={projectsTitle}
                note={section.projects?.subheading}
              >
                {projects.items.length === 0 ? (
                  <p className="text-body-lg text-ink-muted mt-8">{t('home.noProjects')}</p>
                ) : (
                  // A drawing register: each project a sheet, with its own title block.
                  <ol data-testid="project-list" className="mt-12 flex flex-col gap-12">
                    {projects.items.map((project) => {
                      const meta = [project.client, project.location, project.year].filter(
                        (part) => part !== null && String(part).trim() !== '',
                      );
                      return (
                        <li
                          key={project.id}
                          data-reveal
                          className="grid gap-6 md:grid-cols-12 md:items-end md:gap-8"
                        >
                          <div data-snap className="md:col-span-5 lg:col-span-4">
                            <CropMarked>
                              <MediaFrame
                                media={project.cover}
                                ratio="3/2"
                                sizes="(min-width: 1024px) 26rem, (min-width: 768px) 40vw, 100vw"
                                missingLabel={t('preview.photoProject')}
                                missingHint={t('preview.photoHint')}
                                empty="hatched"
                              />
                            </CropMarked>
                          </div>
                          <div className="flex flex-col gap-4 md:col-span-7 lg:col-span-8">
                            <div className="border-ink bg-surface border">
                              <h3
                                data-testid="project-title"
                                className="text-title font-heading stretch-heading px-5 py-4 text-pretty"
                              >
                                {project.title}
                              </h3>
                              {meta.length > 0 ? (
                                <ul className="border-ink divide-ink flex flex-wrap divide-x border-t">
                                  {meta.map((part, index) => (
                                    <li
                                      key={index}
                                      className="text-body-sm text-ink-muted px-5 py-2.5 tabular-nums"
                                    >
                                      {part}
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
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
              </Sheet>
            ) : null}

            {section.why ? (
              <Sheet
                id="why"
                number={numberOf('why')}
                total={total}
                title={whyTitle}
                note={section.why.subheading}
              >
                {/* The text measured by a dimension line down its left side. */}
                <div className="relative mt-10 pl-10 sm:pl-14">
                  <span
                    aria-hidden
                    data-decorative
                    data-measure
                    className="absolute inset-y-0 left-0 flex w-3 flex-col items-center"
                  >
                    <span className="bg-ink block h-px w-3" />
                    <span className="bg-ink block w-px flex-1" />
                    <span className="bg-ink block h-px w-3" />
                  </span>
                  {isBlankHtml(section.why.body) ? (
                    <PendingSlot
                      label={t('preview.pendingWhy')}
                      hint={t('preview.pendingHint')}
                      className="bg-surface max-w-3xl"
                    />
                  ) : (
                    <RichText
                      html={section.why.body}
                      className="text-lead text-ink max-w-3xl text-pretty"
                    />
                  )}
                </div>
              </Sheet>
            ) : null}

            {showInsights ? (
              <Sheet
                id="insights"
                number={numberOf('insights')}
                total={total}
                title={section.insights?.heading || t('nav.insights')}
              >
                {/* A revision table: date, title, category. */}
                <ul className="border-ink mt-10 border-t">
                  {insights.items.map((insight) => (
                    <li
                      key={insight.id}
                      data-reveal
                      className="border-ink grid gap-2 border-b py-5 sm:grid-cols-12 sm:items-baseline sm:gap-6"
                    >
                      <p className="text-body-sm text-ink-subtle tabular-nums sm:col-span-3">
                        {insight.publishedAt
                          ? format.dateTime(new Date(insight.publishedAt), { dateStyle: 'medium' })
                          : null}
                      </p>
                      <div className="flex flex-col gap-1 sm:col-span-6">
                        <h3 className="text-title-sm font-heading stretch-heading">
                          {insight.title}
                        </h3>
                        {insight.excerpt ? (
                          <p className="text-body-sm text-ink-muted text-pretty">
                            {insight.excerpt}
                          </p>
                        ) : null}
                      </div>
                      <p className="text-body-sm text-ink-muted sm:col-span-3 sm:text-right">
                        {insight.category?.name}
                      </p>
                    </li>
                  ))}
                </ul>
              </Sheet>
            ) : null}

            {/* The last sheet, printed as a blueprint: cream line on teal. */}
            <section
              id={INQUIRY_ANCHOR}
              aria-labelledby={`${INQUIRY_ANCHOR}-title`}
              className="px-gutter py-section"
            >
              <div
                data-sheet
                data-blueprint
                data-surface="inverse"
                className="max-w-page relative mx-auto"
              >
                <div aria-hidden data-decorative className="bp-grid absolute inset-0" />
                <SheetFrame number={numberOf(INQUIRY_ANCHOR)} total={total} />
                <div className="relative pt-(--bp-zone-band) md:pl-(--bp-zone-band)">
                  <div className="grid gap-12 px-5 py-12 sm:px-10 lg:grid-cols-12 lg:gap-16 lg:px-16 lg:py-16">
                    <div className="flex flex-col gap-10 lg:col-span-8">
                      <div className="flex flex-col gap-4">
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
                      <InquiryForm
                        locale={locale}
                        submitLabel={section.cta?.ctaLabel || undefined}
                        layout="two-column"
                      />
                    </div>
                    <div className="lg:col-span-4 lg:self-end">
                      <div className="border-ink bg-surface border">
                        <h3 className="border-ink text-body-sm text-ink-muted border-b px-5 py-3 font-medium">
                          {t('home.contactDetails')}
                        </h3>
                        <div className="flex flex-col gap-4 px-5 py-5">
                          <ContactDetails
                            email={layout?.contactEmail ?? null}
                            phone={layout?.phone ?? null}
                            address={layout?.address ?? null}
                          />
                          <SocialLinks links={layout?.socialLinks ?? []} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </main>

          {/* The set's title block, closing the page. */}
          <footer className="px-gutter pb-10">
            <div className="border-ink bg-surface max-w-page mx-auto grid border sm:grid-cols-12">
              <div className="border-ink flex items-center border-b px-5 py-4 sm:col-span-3 sm:border-r sm:border-b-0">
                <Wordmark testId="footer-wordmark" />
              </div>
              <div className="border-ink flex items-center border-b px-5 py-4 sm:col-span-6 sm:border-r sm:border-b-0">
                {layout?.footerText ? (
                  <p className="text-body-sm text-ink-muted text-pretty">{layout.footerText}</p>
                ) : null}
              </div>
              <div className="flex items-center px-5 py-4 sm:col-span-3">
                <p className="text-body-sm text-ink-subtle tabular-nums">
                  © {new Date().getFullYear()} {layout?.siteName || 'STAGER'}
                </p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </BlueprintMotion>
  );
}

/**
 * A sheet's border: four sides (traced one after another on load), the zone
 * markers along the top and down the left, and the sheet number top right.
 */
function SheetFrame({ number, total }: { number: string; total: string }) {
  return (
    <div aria-hidden data-decorative className="pointer-events-none absolute inset-0">
      <span data-edge="top" className="bg-ink absolute inset-x-0 top-0 h-px" />
      <span data-edge="right" className="bg-ink absolute inset-y-0 right-0 w-px" />
      <span data-edge="bottom" className="bg-ink absolute inset-x-0 bottom-0 h-px" />
      <span data-edge="left" className="bg-ink absolute inset-y-0 left-0 w-px" />

      <div className="border-line divide-line absolute inset-x-0 top-0 flex h-(--bp-zone-band) divide-x border-b">
        {ZONES_X.map((zone, index) => (
          <span
            key={zone}
            data-zone
            className={cn(
              'text-caption text-ink-subtle flex flex-1 items-center justify-center',
              index > 3 && 'max-sm:hidden',
            )}
          >
            {zone}
          </span>
        ))}
        <span
          data-zone
          className="text-caption text-ink flex items-center px-3 font-medium tabular-nums"
        >
          {number} / {total}
        </span>
      </div>

      <div className="border-line divide-line absolute top-(--bp-zone-band) bottom-0 left-0 hidden w-(--bp-zone-band) flex-col divide-y border-r md:flex">
        {ZONES_Y.map((zone) => (
          <span
            key={zone}
            data-zone
            className="text-caption text-ink-subtle flex flex-1 items-center justify-center"
          >
            {zone}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Every sheet after the first: its border, its heading, its drawing. */
function Sheet({
  id,
  number,
  total,
  title,
  note,
  children,
}: {
  id: string;
  number: string;
  total: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="px-gutter pt-section">
      <div data-sheet className="max-w-page relative mx-auto">
        <SheetFrame number={number} total={total} />
        <div className="relative pt-(--bp-zone-band) md:pl-(--bp-zone-band)">
          <div className="px-5 py-12 sm:px-10 lg:px-16 lg:py-16">
            <div data-reveal className="flex max-w-3xl flex-col gap-4">
              <h2
                id={`${id}-title`}
                className="text-headline font-heading stretch-heading text-balance"
              >
                {title}
              </h2>
              {note ? <p className="text-body-lg text-ink-muted text-pretty">{note}</p> : null}
            </div>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * A dimension line: slashed ticks at both ends of a hairline. With
 * `fitsHeadline` the client measures the headline's longest line and
 * shortens it to match (see blueprint-motion.service.ts).
 */
function DimensionLine({
  className,
  fitsHeadline,
}: {
  className?: string;
  fitsHeadline?: boolean;
}) {
  return (
    <span
      aria-hidden
      data-decorative
      data-dimension
      data-fits-headline={fitsHeadline ? '' : undefined}
      className={cn('absolute flex h-4 items-center', className)}
    >
      <span className="bg-ink block h-4 w-px rotate-45" />
      <span className="bg-ink block h-px flex-1" />
      <span className="bg-ink block h-4 w-px rotate-45" />
    </span>
  );
}

/** An annotation, tied to the headline above it by a leader line. */
function Callout({ children }: { children: ReactNode }) {
  return (
    <div data-callout className="relative max-w-md pt-2 pl-12 sm:ml-24">
      <span
        aria-hidden
        data-decorative
        data-leader="y"
        className="bg-ink absolute -top-8 left-0 block h-14 w-px origin-top"
      />
      <span
        aria-hidden
        data-decorative
        data-leader="x"
        className="bg-ink absolute top-6 left-0 block h-px w-9 origin-left"
      />
      <span
        aria-hidden
        data-decorative
        data-leader-dot
        className="bg-ink absolute -top-8 left-0 block size-(--bp-dot) -translate-1/2"
      />
      <p data-enter className="text-lead text-ink-muted text-pretty">
        {children}
      </p>
    </div>
  );
}

/** The title block in the corner of the first sheet: whose drawing, which sheet, which language, which year. */
function TitleBlock({
  number,
  total,
  locale,
  year,
}: {
  number: string;
  total: string;
  locale: DbLocale;
  year: number;
}) {
  return (
    <div
      data-title-block
      className="border-ink bg-surface text-body-sm grid w-full max-w-xs grid-cols-3 border"
    >
      <div
        data-cell
        className="border-ink col-span-2 flex items-center border-r border-b px-4 py-2.5"
      >
        <Wordmark testId="sheet-wordmark" />
      </div>
      <div
        data-cell
        className="border-ink text-ink flex items-center justify-center border-b px-3 py-2.5 tabular-nums"
      >
        {number}/{total}
      </div>
      <div
        data-cell
        className="border-ink text-ink-muted col-span-2 flex items-center border-r px-4 py-2.5"
      >
        {locale === 'KA' ? 'ქარ' : 'ENG'}
      </div>
      <div
        data-cell
        className="text-ink-muted flex items-center justify-center px-3 py-2.5 tabular-nums"
      >
        {year}
      </div>
    </div>
  );
}

/** Crop marks round a drawing: an L at each corner, just outside it. */
function CropMarked({ children }: { children: ReactNode }) {
  return (
    <div className="relative p-3">
      <span
        aria-hidden
        data-decorative
        data-mark
        className="bp-mark top-0 left-0 border-t border-l"
      />
      <span
        aria-hidden
        data-decorative
        data-mark
        className="bp-mark top-0 right-0 border-t border-r"
      />
      <span
        aria-hidden
        data-decorative
        data-mark
        className="bp-mark bottom-0 left-0 border-b border-l"
      />
      <span
        aria-hidden
        data-decorative
        data-mark
        className="bp-mark right-0 bottom-0 border-r border-b"
      />
      {children}
    </div>
  );
}

/**
 * The services as the rooms of a floor plan. Each room draws its own top and
 * left walls, and the plan its right and bottom ones, so every wall is drawn
 * exactly once; a dimension line across the top marks where the rooms of
 * the first row meet.
 */
function FloorPlan({ rooms }: { rooms: readonly PublicService[] }) {
  const plan = PLANS[rooms.length] ?? PLANS[1] ?? [];
  const topRowEdges = [
    ...new Set(
      plan.filter(([, , row]) => row === 1).flatMap(([col, span]) => [col - 1, col - 1 + span]),
    ),
  ];

  return (
    <div className="relative mt-12 lg:pt-10">
      <span
        aria-hidden
        data-decorative
        data-dimension
        className="absolute inset-x-0 top-0 hidden h-4 lg:block"
      >
        <span className="bg-ink absolute inset-x-0 top-1/2 block h-px" />
        {topRowEdges.map((edge) => (
          <span
            key={edge}
            className="bp-tick bg-ink absolute top-0 block h-4 w-px rotate-45"
            style={{ '--at': edge } as CSSProperties}
          />
        ))}
      </span>

      <ul data-plan className="bg-surface relative grid lg:grid-cols-12 lg:grid-rows-2">
        <span
          aria-hidden
          data-decorative
          data-wall="y"
          className="bg-ink absolute inset-y-0 right-0 z-(--z-raised) w-(--bp-wall)"
        />
        <span
          aria-hidden
          data-decorative
          data-wall="x"
          className="bg-ink absolute inset-x-0 bottom-0 z-(--z-raised) h-(--bp-wall)"
        />
        {rooms.map((service, index) => {
          const [col, span, row, rowSpan] = plan[index] ?? [1, 12, 1, 2];
          const door = DOOR_CORNERS[index % DOOR_CORNERS.length] ?? 'tl';
          return (
            <li
              key={service.id}
              data-snap
              className="bp-room"
              style={
                {
                  '--col': `${col} / span ${span}`,
                  '--row': `${row} / span ${rowSpan}`,
                } as CSSProperties
              }
            >
              <span
                aria-hidden
                data-decorative
                data-wall="x"
                className="bg-ink absolute inset-x-0 top-0 h-(--bp-wall)"
              />
              <span
                aria-hidden
                data-decorative
                data-wall="y"
                className="bg-ink absolute inset-y-0 left-0 w-(--bp-wall)"
              />
              <Door corner={door} />
              <div className="relative flex h-full flex-col justify-between gap-8 p-7 sm:p-9">
                {/* The icon keeps to the side of the room away from its door. */}
                {hasServiceIcon(service.icon) ? (
                  <ServiceIcon
                    name={service.icon}
                    className={cn('text-title text-ink-muted', door === 'tl' && 'self-end')}
                  />
                ) : (
                  <span />
                )}
                <div className="flex flex-col gap-2">
                  <h3 className="text-title font-heading stretch-heading text-balance">
                    {service.title}
                  </h3>
                  {service.shortDescription ? (
                    <p className="text-body-sm text-ink-muted max-w-sm text-pretty">
                      {service.shortDescription}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Where a door sits, and which way it is drawn. Doors open in a room's top
 * wall, the one wall each room draws itself, so the opening can be cut out
 * of it.
 */
const DOORS = {
  tl: { place: 'top-0 left-8', flip: '' },
  tr: { place: 'top-0 right-8', flip: '-scale-x-100' },
} as const;

/**
 * A door on the plan: an opening in the wall, the leaf standing open and the
 * arc it swings through. Drawn for one corner and mirrored for the others.
 */
function Door({ corner }: { corner: keyof typeof DOORS }) {
  const door = DOORS[corner];
  return (
    <span
      aria-hidden
      data-decorative
      className={cn('absolute block size-(--bp-door)', door.place, door.flip)}
    >
      {/* The opening: paper showing through the wall. */}
      <span className="bg-surface absolute inset-x-0 top-0 block h-(--bp-wall)" />
      <svg viewBox="0 0 44 44" className="text-ink absolute inset-0 size-full overflow-visible">
        <path data-door d="M1 1 V43" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path
          data-door
          d="M1 43 A42 42 0 0 0 43 1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      </svg>
    </span>
  );
}
