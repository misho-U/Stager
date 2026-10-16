import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { ArrowUpRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowUpRight';
import { ChefHatIcon } from '@phosphor-icons/react/dist/ssr/ChefHat';
import { ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { GlobeSimpleIcon } from '@phosphor-icons/react/dist/ssr/GlobeSimple';
import { MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { MicrophoneIcon } from '@phosphor-icons/react/dist/ssr/Microphone';
import { PlayIcon } from '@phosphor-icons/react/dist/ssr/Play';
import { VideoCameraIcon } from '@phosphor-icons/react/dist/ssr/VideoCamera';
import { getFormatter, getTranslations } from 'next-intl/server';
import type { CSSProperties, ReactNode } from 'react';

import {
  courseCategories,
  courseCategoryKey,
  FEW_SEATS,
  type PublicCourse,
} from '@/entity/course/model/course.model';
import type { MediaSummary } from '@/entity/media/model/media.model';
import { INSIGHTS_PATH, type PublicInsightListItem } from '@/entity/insight/model/insight.model';
import { homeSections, type PublicPage } from '@/entity/page/model/page.model';
import type { PublicProjectListItem } from '@/entity/project/model/project.model';
import type { PublicServiceListItem } from '@/entity/service/model/service.model';
import type { PublicStat } from '@/entity/stat/model/stat.model';
import type { PublicVideo } from '@/entity/video/model/video.model';
import { ProjectPhotos } from '@/modules/home-page/elements/chefs-table/elements/project-photos/project-photos.module';
import {
  PlayButton,
  ScreeningPlayer,
} from '@/modules/home-page/elements/chefs-table/elements/screening-room/screening-room.module';
import { StatBand } from '@/modules/home-page/elements/chefs-table/elements/stat-band/stat-band.module';
import { TicketGrid } from '@/modules/home-page/elements/chefs-table/elements/ticket-grid/ticket-grid.module';
import { ContactDetails } from '@/shared/components/contact-details';
import { CtaLink } from '@/shared/components/cta-link';
import { MediaFrame } from '@/shared/components/media-frame';
import { PendingSlot } from '@/shared/components/pending-slot';
import { RichText } from '@/shared/components/rich-text';
import { SampleBadge } from '@/shared/components/sample-badge';
import { hasServiceIcon, ServiceIcon } from '@/shared/components/service-icon';
import { SocialLinks } from '@/shared/components/social-links';
import { BrandMark, siteLogo } from '@/shared/components/brand-mark';
import { CONTENT_ID } from '@/shared/components/skip-link';
import { SiteLink } from '@/shared/components/site-link';
import { cn } from '@/shared/lib/cn';
import { ALL } from '@/shared/lib/motion/use-flip-filter';
import { isBlankHtml, joinMeta, plainTextLength } from '@/shared/lib/content';
import { youtubeId } from '@/shared/lib/youtube';
import type { ListResponse } from '@/shared/types/api';
import type { DbLocale, VideoKind } from '@/shared/types/enums';
import { toAppLocale } from '@pkg/i18n/routing';
import {
  RegisterButton,
  RegistrationDialog,
  SyllabusButton,
} from '@/widgets/course-registration/course-registration.module';
import type { RegistrationCourse } from '@/widgets/course-registration/course-registration.service';
import { INQUIRY_ANCHOR } from '@/widgets/inquiry-form/inquiry-form.constants';
import { InquiryForm } from '@/widgets/inquiry-form/inquiry-form.module';
import { InsightRows } from '@/widgets/insight-list/insight-list.module';
import { LanguageSwitcher } from '@/widgets/language-switcher/language-switcher.module';
import type { SiteChrome } from '@/widgets/site-chrome/site-chrome.service';
import { SiteFooter } from '@/widgets/site-footer/site-footer.module';
import { SiteHeader } from '@/widgets/site-header/site-header.module';
import { SiteMotion } from '@/widgets/site-motion/site-motion.module';
import { SectionIndex, StageDecor } from '@/widgets/stage-decor/stage-decor.module';
import {
  VideoCaption,
  VideoPoster,
  WatchOnYouTube,
} from '@/widgets/video-player/video-player.module';

type ChefsTableProps = {
  locale: DbLocale;
  content: {
    /** The site's settings, and the pages beside this one worth a link. */
    chrome: SiteChrome;
    page: PublicPage | null;
    stats: { items: PublicStat[]; sample: boolean };
    projects: ListResponse<PublicProjectListItem>;
    services: ListResponse<PublicServiceListItem>;
    insights: ListResponse<PublicInsightListItem>;
    courses: { items: PublicCourse[]; sample: boolean };
    videos: { items: PublicVideo[]; sample: boolean };
  };
};

// --- The design's components, one spec each (see chefs-table.css) ---------

const H2 = 'text-headline font-heading stretch-heading text-balance';
const DESCRIPTION = 'text-body-lg text-ink-muted max-w-2xl text-pretty';
const BUTTON =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-body font-medium whitespace-nowrap transition-colors';
const BUTTON_PRIMARY = `${BUTTON} bg-primary text-on-primary hover:bg-primary-hover`;
const BUTTON_OUTLINE = `${BUTTON} border border-line-input text-ink hover:bg-surface-muted`;
const CHIP =
  'text-body-sm bg-surface-muted text-ink-muted inline-flex min-h-8 items-center gap-1.5 rounded-full px-3';
const PLAY_DISC =
  'bg-primary text-on-primary ease-brand flex items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110';

/** Up to this many characters, the intro is set as one large statement. */
const INTRO_STATEMENT_MAX = 220;

/** Up to this many services stand in one row on a wide screen; more read
 *  down the page, as on a phone, rather than squeeze. */
const JOURNEY_ROW_MAX = 5;

const KIND_ICONS: Record<VideoKind, typeof VideoCameraIcon> = {
  EPISODE: VideoCameraIcon,
  PODCAST: MicrophoneIcon,
  MASTERCLASS: ChefHatIcon,
};

/**
 * A section's number and rule, its heading (rising line by line as it comes
 * into view), its line of description, and its actions at the right end.
 */
function SectionHeader({
  id,
  index,
  title,
  description,
  badge,
  action,
}: {
  id: string;
  /** The section's place among those shown, from 1. */
  index: number;
  title: string;
  description?: string | null;
  badge?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex max-w-3xl flex-col gap-4">
        <SectionIndex index={index} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 id={id} data-rise className={H2}>
            {title}
          </h2>
          {badge}
        </div>
        {description ? (
          <p data-reveal className={DESCRIPTION}>
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div data-reveal>{action}</div> : null}
    </div>
  );
}

/** The poster of a video without a picture yet: lit teal, its kind drawn large and faint. */
function PosterPlaceholder({ kind }: { kind: VideoKind | null }) {
  const Icon = kind ? KIND_ICONS[kind] : VideoCameraIcon;
  return (
    <div aria-hidden data-decorative className="ct-poster absolute inset-0 overflow-hidden">
      <Icon
        aria-hidden
        weight="thin"
        className="absolute right-0 bottom-0 size-3/5 translate-x-1/5 translate-y-1/5"
      />
    </div>
  );
}

/** A project's photos in the order its card shows them: the cover, then the gallery. */
function photosOf(project: PublicProjectListItem): MediaSummary[] {
  const photos = project.cover ? [project.cover, ...project.gallery] : project.gallery;
  return photos.filter(
    (photo, index) => photos.findIndex((other) => other.id === photo.id) === index,
  );
}

/** Where a course happens: a pin for a place, a globe for online. */
function CoursePlaceIcon({ course }: { course: PublicCourse }) {
  return course.format === 'ONLINE' ? <GlobeSimpleIcon aria-hidden /> : <MapPinIcon aria-hidden />;
}

/**
 * The site's design, "Chef's Table". Dark and calm: the promise, the company
 * in figures, the services as a journey drawn as it is read, each project's
 * photos on its card, the Academy's courses as admission tickets, the videos
 * full screen, and the page ends at dawn, on teal.
 */
export async function ChefsTable({ locale, content }: ChefsTableProps) {
  const t = await getTranslations();
  const format = await getFormatter();
  const { chrome, page, stats, projects, services, insights, courses, videos } = content;
  const { layout } = chrome;
  const section = homeSections(page);

  // With the page loaded, a missing section was hidden in the dashboard. If
  // the read failed nothing is known, so the lists with their own reads
  // still show (the page says the read failed).
  const pageFailed = page === null;
  const showServices = services.items.length > 0 && (section.services !== undefined || pageFailed);
  const showProjects = section.projects !== undefined || pageFailed;
  const showInsights = insights.items.length > 0 && (section.insights !== undefined || pageFailed);
  // Who STAGER is and why to choose it: one section, the intro and the
  // reasons together (the client's call), shown if either has copy.
  const showAbout = section.intro !== undefined || section.why !== undefined;
  const showAcademy = courses.items.length > 0;
  const showVideos = videos.items.length > 0;

  const ctaLabel = section.hero?.ctaLabel || t('nav.startProject');
  const toInquiry = `#${INQUIRY_ANCHOR}`;
  const siteName = layout?.siteName || 'STAGER';
  const privacyHref = chrome.privacyHref;
  const servicesTitle = section.services?.heading || t('nav.services');
  const projectsTitle = section.projects?.heading || t('nav.projects');
  const insightsTitle = section.insights?.heading || t('nav.insights');
  const whyTitle = section.why?.heading || t('home.why');
  const youtubeChannel = layout?.socialLinks.find((link) => link.platform === 'YOUTUBE') ?? null;

  // This page's sections, then the pages beside it (each once it has
  // something to show), then the form.
  const links = [
    showServices ? { href: '#services', label: t('nav.services') } : null,
    showProjects ? { href: '#projects', label: t('nav.projects') } : null,
    showAcademy ? { href: '#academy', label: t('nav.academy') } : null,
    showVideos ? { href: '#videos', label: t('nav.videos') } : null,
    chrome.teamHref ? { href: chrome.teamHref, label: t('nav.team') } : null,
    chrome.insightsHref ? { href: chrome.insightsHref, label: t('nav.insights') } : null,
    { href: toInquiry, label: ctaLabel },
  ].filter((link) => link !== null);

  // Each section's number, in the order they are shown.
  const numbered = [
    showAbout ? 'about' : null,
    showServices ? 'services' : null,
    showProjects ? 'projects' : null,
    showAcademy ? 'academy' : null,
    showVideos ? 'videos' : null,
    showInsights ? 'insights' : null,
  ].filter((id) => id !== null);
  const indexOf = (id: string) => numbered.indexOf(id) + 1;

  // --- How dates, prices and seats read in this language ---
  const date = (
    iso: string,
    options: { day?: 'numeric'; month?: 'long' | 'short'; weekday?: 'long' | 'short' },
  ) => format.dateTime(new Date(iso), options);
  const longDate = (iso: string) => date(iso, { day: 'numeric', month: 'long' });
  const price = (gel: number | null) =>
    gel === null
      ? t('academy.free')
      : format.number(gel, {
          style: 'currency',
          currency: 'GEL',
          currencyDisplay: 'narrowSymbol',
          maximumFractionDigits: 0,
        });
  const seats = (left: number | null) =>
    left === null ? null : left === 0 ? t('academy.full') : t('academy.seatsLeft', { count: left });
  const minutes = (count: number | null) =>
    count === null ? null : t('videos.minutes', { count });
  const videoMeta = (video: PublicVideo) =>
    joinMeta([video.kind ? t(`videos.kinds.${video.kind}`) : null, minutes(video.durationMinutes)]);
  const registration = (course: PublicCourse): RegistrationCourse => ({
    id: course.id,
    title: course.title,
    date: course.startsAt ? longDate(course.startsAt) : null,
    full: course.seatsLeft === 0,
    details: [
      course.duration || null,
      course.location ?? t(`academy.formats.${course.format}`),
      price(course.priceGel),
    ].filter((detail) => detail !== null),
    syllabus: course.syllabus,
  });

  const sampleBadge = <SampleBadge label={t('sample.badge')} hint={t('sample.hint')} />;
  const nextCourse = courses.items.find((course) => course.seatsLeft !== 0) ?? courses.items[0];
  const [newest, ...olderVideos] = videos.items;

  // A short intro reads as one statement, set large; a long one as text.
  const introIsStatement = plainTextLength(section.intro?.body) <= INTRO_STATEMENT_MAX;
  const tabs = [
    { id: ALL, label: t('academy.all'), count: courses.items.length },
    ...courseCategories(courses.items).map(({ key, name, count }) => ({
      id: key,
      label: name,
      count,
    })),
  ];

  return (
    <SiteMotion>
      <SiteHeader
        links={links}
        cta={{ href: toInquiry, label: ctaLabel }}
        brand={
          <a
            href="#top"
            aria-label={siteName}
            className="inline-flex min-h-11 shrink-0 items-center"
          >
            <BrandMark
              logo={siteLogo(layout)}
              name={siteName}
              decorative
              priority
              className="h-8 md:h-9"
              wordmarkClassName="text-body-lg"
            />
          </a>
        }
        language={<LanguageSwitcher />}
        menuLanguage={<LanguageSwitcher />}
        teaser={
          nextCourse ? (
            <a
              href="#academy"
              className="bg-surface-muted hover:bg-surface-raised border-line flex flex-col gap-1 rounded-lg border p-4 transition-colors"
            >
              <span className="text-body-sm text-accent font-medium">{t('academy.next')}</span>
              <span className="text-body font-heading text-balance">{nextCourse.title}</span>
              <span className="text-body-sm text-ink-muted">
                {nextCourse.startsAt
                  ? t('academy.starts', { date: longDate(nextCourse.startsAt) })
                  : t('academy.dateTba')}
              </span>
            </a>
          ) : null
        }
        labels={{ nav: t('home.sections'), menu: t('home.menu'), close: t('home.close') }}
      />

      <main id={CONTENT_ID} tabIndex={-1}>
        {/* --- Hero: the promise, and the one way to act on it --- */}
        <section id="top" data-ct-hero aria-labelledby="hero-heading" className="relative">
          <div
            data-ct-light
            className="ct-light ct-light-fade px-gutter relative isolate flex min-h-(--ct-hero-h) flex-col justify-end pt-32 pb-16 lg:pb-24"
          >
            <StageDecor floor="right" />
            <div data-hero-copy className="max-w-page mx-auto flex w-full flex-col gap-7">
              <h1
                id="hero-heading"
                data-testid="hero-heading"
                data-enter
                data-ct-headline
                className="text-display font-hero stretch-hero max-w-(--ct-hero-measure) text-balance"
              >
                {section.hero?.heading || (
                  <span className="text-ink-subtle">[no hero heading set]</span>
                )}
              </h1>
              {section.hero?.subheading ? (
                <p data-enter className="text-lead text-ink-muted max-w-xl text-pretty">
                  {section.hero.subheading}
                </p>
              ) : null}
              <div data-enter className="pt-2">
                <span data-magnetic className="inline-flex">
                  <CtaLink href={toInquiry} size="lg" icon="down">
                    {ctaLabel}
                  </CtaLink>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* --- The company in figures --- */}
        {stats.items.length > 0 ? (
          <StatBand
            stats={stats.items}
            label={t('home.stats')}
            badge={stats.sample ? sampleBadge : null}
          />
        ) : null}

        {/* --- Who STAGER is and why to choose it, one section: the heading
            held at the left on a wide screen while the intro lights up as it
            is read, then the reasons, one to a line, numbered --- */}
        {showAbout ? (
          <section
            id="about"
            aria-labelledby="about-title"
            className="px-gutter py-section relative isolate"
          >
            <StageDecor light="left" floor="right" />
            <div className="max-w-page mx-auto grid gap-10 lg:grid-cols-12 lg:gap-10">
              <div className="flex flex-col gap-4 self-start lg:sticky lg:top-32 lg:col-span-4">
                <SectionIndex index={indexOf('about')} />
                <h2 id="about-title" data-rise className={H2}>
                  {section.intro ? section.intro.heading || t('nav.about') : whyTitle}
                </h2>
              </div>
              <div className="flex flex-col gap-16 lg:col-span-8 xl:col-span-7 xl:col-start-6">
                {section.intro ? (
                  <div className="flex flex-col gap-8">
                    {isBlankHtml(section.intro.body) ? (
                      <PendingSlot
                        label={t('preview.pendingIntro')}
                        hint={t('preview.pendingHint')}
                        className="max-w-xl"
                      />
                    ) : (
                      <div data-read-along>
                        <RichText
                          html={section.intro.body}
                          className={cn(
                            'text-pretty',
                            introIsStatement ? 'ct-statement' : 'text-title-lg',
                          )}
                        />
                      </div>
                    )}
                    {section.intro.media ? (
                      <div data-reveal>
                        <MediaFrame
                          media={section.intro.media}
                          ratio="16/9"
                          sizes="(min-width: 1024px) 60vw, 100vw"
                          missingLabel={t('preview.photoSection')}
                          className="rounded-lg"
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {section.why ? (
                  <div id="why" className="flex flex-col gap-6">
                    {/* Under the intro, the reasons have a heading of their
                        own; alone, the section's heading is theirs. */}
                    {section.intro ? (
                      <h3
                        data-rise
                        className="text-title font-heading stretch-heading text-balance"
                      >
                        {whyTitle}
                      </h3>
                    ) : null}
                    {section.why.subheading ? (
                      <p data-reveal className="text-body-lg text-ink-muted text-pretty">
                        {section.why.subheading}
                      </p>
                    ) : null}
                    {isBlankHtml(section.why.body) ? (
                      <PendingSlot
                        label={t('preview.pendingWhy')}
                        hint={t('preview.pendingHint')}
                        className="max-w-xl"
                      />
                    ) : (
                      <div data-reveal-items>
                        <RichText html={section.why.body} className="ct-reasons" />
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {/* --- Services: the journey from an idea to a working business, one
            stage after another along a line the page draws as it is read --- */}
        {showServices ? (
          <section
            id="services"
            aria-labelledby="services-title"
            className="px-gutter py-section relative isolate"
          >
            <StageDecor light="right" />
            <div className="max-w-page mx-auto flex flex-col gap-12 lg:gap-16">
              <SectionHeader
                id="services-title"
                index={indexOf('services')}
                title={servicesTitle}
                description={section.services?.subheading}
              />
              <ol
                data-journey
                data-row={services.items.length <= JOURNEY_ROW_MAX ? '' : undefined}
                className="ct-journey"
                style={{ '--steps': services.items.length } as CSSProperties}
              >
                {services.items.map((service) => (
                  <li key={service.id} data-journey-step data-reveal className="ct-step">
                    <span aria-hidden className="ct-step-node">
                      {hasServiceIcon(service.icon) ? <ServiceIcon name={service.icon} /> : null}
                    </span>
                    <div className="ct-step-card">
                      <h3 className="text-title-sm font-heading text-balance">{service.title}</h3>
                      {service.shortDescription ? (
                        <p className="ct-step-text text-ink-muted text-pretty">
                          {service.shortDescription}
                        </p>
                      ) : null}
                      {service.cover ? (
                        <MediaFrame
                          media={service.cover}
                          ratio="3/2"
                          sizes="(min-width: 1280px) 16rem, (min-width: 640px) 36rem, 80vw"
                          missingLabel={t('preview.photoSection')}
                          className="mt-auto rounded-(--ct-thumb-radius)"
                        />
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        ) : null}

        {/* --- Projects: a card each, its photos one after another, what it
            was about shown under the pointer --- */}
        {showProjects ? (
          <section id="projects" aria-labelledby="projects-title" className="px-gutter py-section">
            <div className="max-w-page mx-auto flex flex-col gap-12">
              <SectionHeader
                id="projects-title"
                index={indexOf('projects')}
                title={projectsTitle}
                description={section.projects?.subheading}
              />
              {projects.items.length === 0 ? (
                <p className="text-body-lg text-ink-muted">{t('home.noProjects')}</p>
              ) : (
                <ul
                  data-testid="project-list"
                  className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {projects.items.map((project) => {
                    const meta = joinMeta([project.client, project.location, project.year]);
                    const photos = photosOf(project);
                    // With no arrows to focus, the frame itself takes focus,
                    // so the summary shows for a keyboard as for a mouse.
                    const focusable = project.summary !== '' && photos.length < 2;
                    return (
                      <li key={project.id} data-reveal>
                        <article className="ct-project">
                          <div
                            role={focusable ? 'group' : undefined}
                            aria-label={focusable ? project.title : undefined}
                            tabIndex={focusable ? 0 : undefined}
                            className="ct-project-frame ct-spot relative aspect-4/3 overflow-hidden rounded-lg"
                          >
                            {photos.length > 0 ? (
                              <ProjectPhotos
                                slides={photos.map((photo) => (
                                  <MediaFrame
                                    key={photo.id}
                                    media={photo}
                                    ratio="fill"
                                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"
                                    missingLabel={t('preview.photoProject')}
                                    className="size-full"
                                  />
                                ))}
                                label={t('home.photos.label', { title: project.title })}
                                labels={{
                                  carousel: t('home.photos.carousel'),
                                  slide: t('home.photos.slide'),
                                  previous: t('home.photos.previous'),
                                  next: t('home.photos.next'),
                                }}
                                slideLabels={photos.map((_, index) =>
                                  t('home.photos.position', {
                                    index: index + 1,
                                    count: photos.length,
                                  }),
                                )}
                              />
                            ) : (
                              <div className="ct-poster absolute inset-0 flex items-end p-6">
                                {project.year ? (
                                  <span className="text-title-lg font-heading text-ink tabular-nums">
                                    {project.year}
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </div>
                          <div className="ct-project-text flex flex-col gap-1.5 pt-5">
                            <h3
                              data-testid="project-title"
                              className="text-title-sm font-heading text-balance"
                            >
                              {project.title}
                            </h3>
                            {meta ? <p className="text-body-sm text-ink-muted">{meta}</p> : null}
                          </div>
                          {project.summary ? (
                            <p data-testid="project-summary" className="ct-project-summary">
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

        {/* --- STAGER Academy: admission tickets, under its own light --- */}
        {showAcademy ? (
          <section
            id="academy"
            aria-labelledby="academy-title"
            className="ct-light ct-light-top px-gutter py-section relative"
          >
            <div className="max-w-page mx-auto flex flex-col gap-10">
              <SectionHeader
                id="academy-title"
                index={indexOf('academy')}
                title={t('academy.title')}
                description={t('academy.intro')}
                badge={courses.sample ? sampleBadge : null}
              />
              <div data-reveal>
                <TicketGrid
                  tabs={tabs}
                  filterLabel={t('academy.filterLabel')}
                  tickets={courses.items.map((course) => {
                    const full = course.seatsLeft === 0;
                    const few =
                      course.seatsLeft !== null &&
                      course.seatsLeft > 0 &&
                      course.seatsLeft <= FEW_SEATS;
                    return {
                      id: course.id,
                      category: courseCategoryKey(course),
                      node: (
                        <article className="ct-ticket ct-spot bg-surface-raised flex h-full flex-col overflow-hidden rounded-lg sm:flex-row">
                          <div className="flex flex-1 flex-col gap-4 p-6 sm:p-8">
                            <p className="text-body-sm text-accent font-medium">
                              {joinMeta([
                                course.category?.name,
                                t(`academy.formats.${course.format}`),
                              ])}
                            </p>
                            <h3 className="text-title font-heading stretch-heading text-balance">
                              {course.title}
                            </h3>
                            <p className="text-body-sm text-ink-muted line-clamp-3 text-pretty">
                              {course.summary}
                            </p>
                            <ul className="flex flex-wrap gap-2">
                              <li className={CHIP}>
                                <ClockIcon aria-hidden />
                                {course.duration}
                              </li>
                              <li className={CHIP}>
                                <CoursePlaceIcon course={course} />
                                {course.location ?? t(`academy.formats.${course.format}`)}
                              </li>
                            </ul>
                            <div className="mt-auto flex flex-wrap gap-3 pt-2">
                              <RegisterButton
                                course={registration(course)}
                                className={full ? BUTTON_OUTLINE : BUTTON_PRIMARY}
                              >
                                {full ? t('academy.waitlist') : t('academy.register')}
                              </RegisterButton>
                              {course.syllabus.length > 0 ? (
                                <SyllabusButton
                                  course={registration(course)}
                                  className={BUTTON_OUTLINE}
                                >
                                  {t('academy.syllabus')}
                                </SyllabusButton>
                              ) : null}
                            </div>
                          </div>
                          {/* The stub: torn off along the dashed line. */}
                          <div className="ct-tear -order-1 flex items-center justify-between gap-4 p-6 sm:order-none sm:w-(--ct-ticket-stub) sm:flex-col sm:items-start">
                            {course.startsAt ? (
                              <p className="flex flex-col">
                                <span className="text-title-lg font-heading leading-none tabular-nums">
                                  {date(course.startsAt, { day: 'numeric' })}
                                </span>
                                <span className="text-body-sm mt-1 font-semibold">
                                  {date(course.startsAt, { month: 'long' })}
                                </span>
                                <span className="text-caption text-ink-muted">
                                  {date(course.startsAt, { weekday: 'long' })}
                                </span>
                              </p>
                            ) : (
                              <p className="text-body-sm font-semibold">{t('academy.dateTba')}</p>
                            )}
                            <div className="flex flex-col items-end sm:items-start">
                              <p className="text-title-sm font-heading tabular-nums">
                                {price(course.priceGel)}
                              </p>
                              <p
                                className={cn(
                                  'text-body-sm',
                                  few ? 'text-accent font-semibold' : 'text-ink-muted',
                                )}
                              >
                                {seats(course.seatsLeft)}
                              </p>
                            </div>
                          </div>
                        </article>
                      ),
                    };
                  })}
                />
              </div>
            </div>
          </section>
        ) : null}

        {/* --- Videos: the screening room --- */}
        {showVideos && newest ? (
          <section id="videos" aria-labelledby="videos-title" className="px-gutter py-section">
            <div className="max-w-page mx-auto flex flex-col gap-12">
              <SectionHeader
                id="videos-title"
                index={indexOf('videos')}
                title={t('videos.title')}
                description={t('videos.intro')}
                badge={videos.sample ? sampleBadge : null}
                action={
                  youtubeChannel ? (
                    <a
                      href={youtubeChannel.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={BUTTON_OUTLINE}
                    >
                      {t('videos.allOnYouTube')}
                      <ArrowUpRightIcon aria-hidden />
                    </a>
                  ) : null
                }
              />

              {/* The newest, large: its title on the frame on a phone, where
                  room is short, and beside it, from the frame's top, on a
                  wide screen. */}
              <article data-reveal className="grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-10">
                <div
                  data-video-card
                  className="ct-spot relative aspect-video overflow-hidden rounded-lg lg:col-span-8"
                >
                  <div data-poster className="absolute inset-0">
                    <VideoPoster
                      youtubeUrl={newest.youtubeUrl}
                      poster={newest.poster}
                      sizes="(min-width: 1024px) 66vw, 100vw"
                      placeholder={<PosterPlaceholder kind={newest.kind} />}
                    />
                  </div>
                  <VideoCaption className="ct-caption lg:hidden">
                    <p className="text-caption sm:text-body-sm ct-caption-meta">
                      {videoMeta(newest)}
                    </p>
                    <p className="text-title-sm sm:text-title font-heading stretch-heading line-clamp-2 text-balance">
                      {newest.title}
                    </p>
                  </VideoCaption>
                  <PlayButton
                    videoId={newest.id}
                    label={t('videos.playTitle', { title: newest.title })}
                    growFrom="[data-poster]"
                    className="group absolute inset-0 flex items-center justify-center max-lg:pb-(--ct-play-lift)"
                  >
                    <span className={`${PLAY_DISC} size-(--ct-play-sm) sm:size-(--ct-play)`}>
                      <PlayIcon aria-hidden weight="fill" size="1.5rem" />
                    </span>
                  </PlayButton>
                  <WatchOnYouTube
                    youtubeUrl={newest.youtubeUrl}
                    label={t('videos.watchOnYouTube', { title: newest.title })}
                    className="ct-youtube absolute top-3 right-3 sm:top-4 sm:right-4"
                  />
                </div>
                <div className="flex flex-col gap-4 max-lg:sr-only lg:col-span-4">
                  <p className="text-body-sm text-ink-muted">
                    {joinMeta([videoMeta(newest), longDate(newest.publishedAt)])}
                  </p>
                  <h3 className="text-title-lg font-heading stretch-heading text-balance">
                    {newest.title}
                  </h3>
                  {newest.summary ? (
                    <p className="text-body-lg text-ink-muted text-pretty">{newest.summary}</p>
                  ) : null}
                </div>
              </article>

              {olderVideos.length > 0 ? (
                <ul className="max-sm:-mx-gutter max-sm:px-gutter max-sm:scroll-px-gutter grid [scrollbar-width:none] gap-x-6 gap-y-10 max-sm:flex max-sm:snap-x max-sm:snap-mandatory max-sm:overflow-x-auto sm:grid-cols-2 lg:grid-cols-4">
                  {olderVideos.map((video) => (
                    <li
                      key={video.id}
                      data-reveal
                      className="max-sm:w-(--ct-video-w-sm) max-sm:shrink-0 max-sm:snap-start"
                    >
                      <article data-video-card className="flex flex-col gap-4">
                        <div className="ct-spot relative aspect-video overflow-hidden rounded-lg">
                          <div data-poster className="absolute inset-0">
                            <VideoPoster
                              youtubeUrl={video.youtubeUrl}
                              poster={video.poster}
                              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 80vw"
                              placeholder={<PosterPlaceholder kind={video.kind} />}
                            />
                          </div>
                          <PlayButton
                            videoId={video.id}
                            label={t('videos.playTitle', { title: video.title })}
                            growFrom="[data-poster]"
                            className="group absolute inset-0 flex items-center justify-center"
                          >
                            <span className={`${PLAY_DISC} size-(--ct-play-sm)`}>
                              <PlayIcon aria-hidden weight="fill" size="1.25rem" />
                            </span>
                          </PlayButton>
                          <span className="ct-tag absolute top-3 left-3">{videoMeta(video)}</span>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-title-sm font-heading stretch-heading text-balance">
                            {video.title}
                          </h3>
                          <WatchOnYouTube
                            youtubeUrl={video.youtubeUrl}
                            label={t('videos.watchOnYouTube', { title: video.title })}
                            className="ct-youtube-quiet shrink-0"
                          />
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* --- Insights: the latest one, opening its own page --- */}
        {showInsights ? (
          <section
            id="insights"
            aria-labelledby="insights-title"
            className="px-gutter py-section relative isolate"
          >
            <StageDecor light="left" />
            <div className="max-w-page mx-auto flex flex-col gap-12">
              <SectionHeader
                id="insights-title"
                index={indexOf('insights')}
                title={insightsTitle}
                description={section.insights?.subheading}
                action={
                  <SiteLink
                    href={`/${toAppLocale(locale)}${INSIGHTS_PATH}`}
                    data-testid="all-insights"
                    className={BUTTON_OUTLINE}
                  >
                    {t('insights.all')}
                    <ArrowRightIcon aria-hidden />
                  </SiteLink>
                }
              />
              <InsightRows
                items={insights.items}
                base={`/${toAppLocale(locale)}`}
                headingLevel="h3"
              />
            </div>
          </section>
        ) : null}

        {/* --- The finale: an iris opening onto teal --- */}
        <section
          id={INQUIRY_ANCHOR}
          aria-labelledby={`${INQUIRY_ANCHOR}-title`}
          data-surface="inverse"
          data-iris
          className="px-gutter py-section"
        >
          <div className="max-w-page mx-auto grid gap-14 lg:grid-cols-12 lg:gap-10">
            <div className="flex flex-col gap-6 lg:col-span-5">
              <h2 id={`${INQUIRY_ANCHOR}-title`} className={H2}>
                {section.cta?.heading || t('contact.title')}
              </h2>
              {section.cta?.subheading ? (
                <p className={DESCRIPTION}>{section.cta.subheading}</p>
              ) : null}
              <div className="flex flex-col gap-3 pt-4">
                <h3 className="text-body-sm text-ink-muted font-medium">
                  {t('home.contactDetails')}
                </h3>
                <ContactDetails
                  email={layout?.contactEmail ?? null}
                  phone={layout?.phone ?? null}
                  address={layout?.address ?? null}
                />
              </div>
              <SocialLinks links={layout?.socialLinks ?? []} showLabels />
            </div>
            <div className="lg:col-span-7">
              <div className="bg-surface-raised rounded-lg p-6 sm:p-10">
                <InquiryForm
                  locale={locale}
                  submitLabel={ctaLabel}
                  layout="two-column"
                  privacyHref={privacyHref}
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter
        layout={layout}
        links={links}
        privacy={privacyHref ? { href: privacyHref, label: t('privacy.title') } : null}
        labels={{ sections: t('home.sections'), rights: t('home.rights') }}
      />

      <RegistrationDialog
        locale={locale}
        privacyHref={privacyHref}
        registerClassName={`${BUTTON_PRIMARY} w-full`}
      />
      <ScreeningPlayer
        videos={videos.items.map((video) => ({
          id: video.id,
          title: video.title,
          meta: joinMeta([videoMeta(video), longDate(video.publishedAt)]),
          summary: video.summary,
          youtubeId: youtubeId(video.youtubeUrl),
          fileUrl: video.fileUrl,
        }))}
        labels={{ close: t('videos.close'), unavailable: t('videos.unavailable') }}
      />
    </SiteMotion>
  );
}
