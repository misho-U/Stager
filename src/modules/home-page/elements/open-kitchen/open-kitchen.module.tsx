import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { ArrowUpRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowUpRight';
import { ChefHatIcon } from '@phosphor-icons/react/dist/ssr/ChefHat';
import { ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { GlobeSimpleIcon } from '@phosphor-icons/react/dist/ssr/GlobeSimple';
import { GraduationCapIcon } from '@phosphor-icons/react/dist/ssr/GraduationCap';
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
  relatedCourses,
} from '@/entity/course/model/course.model';
import type { PublicInsightListItem } from '@/entity/insight/model/insight.model';
import { homeSections, type PublicPage } from '@/entity/page/model/page.model';
import type { PublicProjectListItem } from '@/entity/project/model/project.model';
import type { PublicService } from '@/entity/service/model/service.model';
import type { PublicLayoutData } from '@/entity/site-setting/model/site-setting.model';
import type { PublicVideo } from '@/entity/video/model/video.model';
import { AcademyTimetable } from '@/modules/home-page/elements/open-kitchen/elements/academy-timetable/academy-timetable.module';
import { LiveBoard } from '@/modules/home-page/elements/open-kitchen/elements/live-board/live-board.module';
import { OkHeader } from '@/modules/home-page/elements/open-kitchen/elements/ok-header/ok-header.module';
import { OpenKitchenMotion } from '@/modules/home-page/elements/open-kitchen/elements/open-kitchen-motion/open-kitchen-motion.module';
import { ProjectRail } from '@/modules/home-page/elements/open-kitchen/elements/project-rail/project-rail.module';
import {
  PlayInSectionButton,
  VideoPlaylist,
} from '@/modules/home-page/elements/open-kitchen/elements/video-playlist/video-playlist.module';
import { ContactDetails } from '@/shared/components/contact-details';
import { CtaLink } from '@/shared/components/cta-link';
import { MediaFrame } from '@/shared/components/media-frame';
import { PendingSlot } from '@/shared/components/pending-slot';
import { RichText } from '@/shared/components/rich-text';
import { SampleBadge } from '@/shared/components/sample-badge';
import { hasServiceIcon, ServiceIcon } from '@/shared/components/service-icon';
import { SocialLinks } from '@/shared/components/social-links';
import { Wordmark } from '@/shared/components/wordmark';
import { cn } from '@/shared/lib/cn';
import { ALL } from '@/shared/lib/motion/use-flip-filter';
import { isBlankHtml, joinMeta, plainTextLength } from '@/shared/lib/content';
import { youtubeId } from '@/shared/lib/youtube';
import type { ListResponse } from '@/shared/types/api';
import type { DbLocale, VideoKind } from '@/shared/types/enums';
import {
  RegisterButton,
  RegistrationDialog,
} from '@/widgets/course-registration/course-registration.module';
import type { RegistrationCourse } from '@/widgets/course-registration/course-registration.service';
import { INQUIRY_ANCHOR } from '@/widgets/inquiry-form/inquiry-form.constants';
import { InquiryForm } from '@/widgets/inquiry-form/inquiry-form.module';
import { LanguageSwitcher } from '@/widgets/language-switcher/language-switcher.module';
import { VideoPoster } from '@/widgets/video-player/video-player.module';

type OpenKitchenProps = {
  locale: DbLocale;
  content: {
    layout: PublicLayoutData | null;
    page: PublicPage | null;
    projects: ListResponse<PublicProjectListItem>;
    services: ListResponse<PublicService>;
    insights: ListResponse<PublicInsightListItem>;
    courses: { items: PublicCourse[]; sample: boolean };
    videos: { items: PublicVideo[]; sample: boolean };
  };
};

// --- The design's components, one spec each (see open-kitchen.css) --------

const H2 = 'text-headline font-heading text-balance';
const DESCRIPTION = 'text-body-lg text-ink-muted max-w-2xl text-pretty';
const BUTTON =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-body font-medium whitespace-nowrap transition-colors';
const BUTTON_PRIMARY = `${BUTTON} bg-primary text-on-primary hover:bg-primary-hover`;
const BUTTON_OUTLINE = `${BUTTON} border border-line-input text-ink hover:bg-surface-raised`;
const CHIP =
  'text-body-sm bg-surface-raised text-ink-muted inline-flex min-h-8 items-center gap-1.5 rounded-full px-3';

/** Up to this many characters, the intro is set as one large statement. */
const INTRO_STATEMENT_MAX = 220;

/** The projects rail's photo-less tiles take these in turn. */
const TILE_TONES = ['light', 'sage', 'deep'] as const;

const KIND_ICONS: Record<VideoKind, typeof VideoCameraIcon> = {
  EPISODE: VideoCameraIcon,
  PODCAST: MicrophoneIcon,
  MASTERCLASS: ChefHatIcon,
};

/** Where a course happens: a pin for a place, a globe for online. */
function CoursePlaceIcon({ course }: { course: PublicCourse }) {
  return course.format === 'ONLINE' ? <GlobeSimpleIcon aria-hidden /> : <MapPinIcon aria-hidden />;
}

/** A section's heading, its line of description, and its actions at the right end. */
function SectionHeader({
  id,
  title,
  description,
  badge,
  action,
}: {
  id: string;
  title: string;
  description?: string | null;
  badge?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex max-w-3xl flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 id={id} className={H2}>
            {title}
          </h2>
          {badge}
        </div>
        {description ? <p className={DESCRIPTION}>{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** The poster of a video without a picture yet: teal, the kind of programme drawn large and faint. */
function PosterPlaceholder({ kind }: { kind: VideoKind | null }) {
  const Icon = kind ? KIND_ICONS[kind] : VideoCameraIcon;
  return (
    <div aria-hidden data-decorative className="ok-poster absolute inset-0 overflow-hidden">
      <Icon
        aria-hidden
        weight="thin"
        className="absolute right-0 bottom-0 size-3/5 translate-x-1/5 translate-y-1/5"
      />
    </div>
  );
}

/**
 * Option 1, "Open Kitchen". Light, precise and content-led: everything on the
 * page can be explored where it stands. A live board of what is happening
 * now, a services explorer, a rail of projects, the Academy's timetable, a
 * video playlist, then the reasons, the writing and the form.
 */
export async function OpenKitchen({ locale, content }: OpenKitchenProps) {
  const t = await getTranslations();
  const format = await getFormatter();
  const { layout, page, projects, services, insights, courses, videos } = content;
  const section = homeSections(page);

  // With the page loaded, a missing section was hidden in the dashboard. If
  // the read failed nothing is known, so the lists with their own reads
  // still show (the page says the read failed).
  const pageFailed = page === null;
  const showServices = services.items.length > 0 && (section.services !== undefined || pageFailed);
  const showProjects = section.projects !== undefined || pageFailed;
  const showInsights = insights.items.length > 0 && (section.insights !== undefined || pageFailed);
  const showAcademy = courses.items.length > 0;
  const showVideos = videos.items.length > 0;

  const ctaLabel = section.hero?.ctaLabel || t('nav.startProject');
  const toInquiry = `#${INQUIRY_ANCHOR}`;
  const siteName = layout?.siteName || 'STAGER';
  const servicesTitle = section.services?.heading || t('nav.services');
  const projectsTitle = section.projects?.heading || t('nav.projects');
  const insightsTitle = section.insights?.heading || t('nav.insights');
  const whyTitle = section.why?.heading || t('home.why');
  const youtubeChannel = layout?.socialLinks.find((link) => link.platform === 'YOUTUBE') ?? null;

  const links = [
    showServices ? { href: '#services', label: t('nav.services') } : null,
    showProjects ? { href: '#projects', label: t('nav.projects') } : null,
    showAcademy ? { href: '#academy', label: t('nav.academy') } : null,
    showVideos ? { href: '#videos', label: t('nav.videos') } : null,
    showInsights ? { href: '#insights', label: t('nav.insights') } : null,
  ].filter((link) => link !== null);

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
  const registration = (course: PublicCourse): RegistrationCourse => ({
    id: course.id,
    title: course.title,
    date: course.startsAt ? longDate(course.startsAt) : null,
    full: course.seatsLeft === 0,
  });

  // A short intro reads as one statement, set large; a long one as text.
  const introIsStatement = plainTextLength(section.intro?.body) <= INTRO_STATEMENT_MAX;

  const sampleBadge = <SampleBadge label={t('sample.badge')} hint={t('sample.hint')} />;
  const nextCourse = courses.items.find((course) => course.seatsLeft !== 0) ?? courses.items[0];
  const newestVideo = videos.items[0];
  const featuredProject = projects.items.find((project) => project.featured) ?? projects.items[0];

  // --- The live board's cards ---
  const boardCards = [
    nextCourse
      ? {
          id: 'course',
          name: t('academy.next'),
          node: (
            <article className="flex h-full flex-col gap-6 rounded-lg bg-(--ok-academy) p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <p className="text-body-sm text-ink-muted font-medium">{t('academy.next')}</p>
                {courses.sample ? sampleBadge : null}
              </div>
              {nextCourse.startsAt ? (
                <div className="flex items-end gap-4">
                  <p className="text-display font-hero leading-none tabular-nums">
                    {date(nextCourse.startsAt, { day: 'numeric' })}
                  </p>
                  <p className="flex flex-col pb-1">
                    <span className="text-title-sm font-heading">
                      {date(nextCourse.startsAt, { month: 'long' })}
                    </span>
                    <span className="text-body-sm text-ink-muted">
                      {date(nextCourse.startsAt, { weekday: 'long' })}
                    </span>
                  </p>
                </div>
              ) : (
                <p className="text-title font-heading">{t('academy.dateTba')}</p>
              )}
              <div className="flex flex-col gap-2">
                <h3 className="text-title font-heading text-balance">{nextCourse.title}</h3>
                <p className="text-body-sm text-ink-muted line-clamp-3 text-pretty">
                  {nextCourse.summary}
                </p>
              </div>
              <ul className="flex flex-wrap gap-2">
                <li className={CHIP}>
                  <ClockIcon aria-hidden />
                  {nextCourse.duration}
                </li>
                <li className={CHIP}>
                  <CoursePlaceIcon course={nextCourse} />
                  {nextCourse.location ?? t(`academy.formats.${nextCourse.format}`)}
                </li>
              </ul>
              <div className="border-line-strong mt-auto flex flex-wrap items-center justify-between gap-4 border-t pt-5">
                <div className="flex flex-col">
                  <p className="text-title-sm font-heading tabular-nums">
                    {price(nextCourse.priceGel)}
                  </p>
                  <p className="text-body-sm text-ink-muted">{seats(nextCourse.seatsLeft)}</p>
                </div>
                <RegisterButton course={registration(nextCourse)} className={BUTTON_PRIMARY}>
                  {t('academy.register')}
                </RegisterButton>
              </div>
            </article>
          ),
        }
      : null,
    newestVideo
      ? {
          id: 'video',
          name: t('videos.latest'),
          node: (
            <article className="bg-surface-raised flex h-full flex-col gap-6 overflow-hidden rounded-lg p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <p className="text-body-sm text-ink-muted font-medium">{t('videos.latest')}</p>
                {videos.sample ? sampleBadge : null}
              </div>
              <div className="relative aspect-video overflow-hidden rounded-(--ok-radius-thumb)">
                <VideoPoster
                  youtubeUrl={newestVideo.youtubeUrl}
                  sizes="(min-width: 1024px) 34vw, 100vw"
                  placeholder={<PosterPlaceholder kind={newestVideo.kind} />}
                />
                <PlayInSectionButton
                  videoId={newestVideo.id}
                  sectionId="videos"
                  label={t('videos.playTitle', { title: newestVideo.title })}
                  className="group absolute inset-0 flex items-center justify-center"
                >
                  <span className="bg-surface-raised text-ink shadow-card ease-brand flex size-(--ok-play-sm) items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110">
                    <PlayIcon aria-hidden weight="fill" size="1.25rem" />
                  </span>
                </PlayInSectionButton>
              </div>
              <div className="flex flex-1 flex-col gap-3">
                <h3 className="text-title font-heading text-balance">{newestVideo.title}</h3>
                <p className="text-body-sm text-ink-muted mt-auto">
                  {joinMeta([
                    newestVideo.kind ? t(`videos.kinds.${newestVideo.kind}`) : null,
                    minutes(newestVideo.durationMinutes),
                  ])}
                </p>
              </div>
            </article>
          ),
        }
      : null,
    featuredProject
      ? {
          id: 'project',
          name: t('home.featuredProject'),
          node: (
            <article className="bg-surface-raised flex h-full flex-col gap-6 overflow-hidden rounded-lg p-6 sm:p-8">
              <p className="text-body-sm text-ink-muted font-medium">{t('home.featuredProject')}</p>
              <div className="relative aspect-video overflow-hidden rounded-(--ok-radius-thumb)">
                {featuredProject.cover ? (
                  <MediaFrame
                    media={featuredProject.cover}
                    ratio="fill"
                    sizes="(min-width: 1024px) 34vw, 100vw"
                    missingLabel={t('preview.photoProject')}
                    className="absolute inset-0 size-full"
                  />
                ) : (
                  <div className="ok-tile absolute inset-0 flex items-end justify-between p-6">
                    <span className="text-display font-hero text-primary tabular-nums">
                      {featuredProject.year ?? featuredProject.title.slice(0, 1)}
                    </span>
                    {featuredProject.location ? (
                      <span className="text-body-sm text-ink-muted">
                        {featuredProject.location}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-3">
                <h3 className="text-title font-heading text-balance">{featuredProject.title}</h3>
                {featuredProject.client ? (
                  <p className="text-body-sm text-ink-muted">{featuredProject.client}</p>
                ) : null}
                <a
                  href="#projects"
                  className="text-body text-primary mt-auto inline-flex min-h-11 items-center gap-2 font-medium hover:underline hover:underline-offset-4"
                >
                  {t('home.seeProjects')}
                  <ArrowRightIcon aria-hidden />
                </a>
              </div>
            </article>
          ),
        }
      : null,
  ]
    .filter((card) => card !== null)
    .map((card) => ({ ...card, showLabel: t('home.board.show', { name: card.name }) }));

  // --- The course each service points at, and the Academy's filter ---
  const coursesByService = relatedCourses(services.items, courses.items);
  const chips = [
    { id: ALL, label: t('academy.all'), count: courses.items.length },
    ...courseCategories(courses.items).map(({ key, name, count }) => ({
      id: key,
      label: name,
      count,
    })),
  ];

  return (
    <OpenKitchenMotion>
      <OkHeader
        links={links}
        cta={{ href: toInquiry, label: ctaLabel }}
        brand={
          <a
            href="#top"
            aria-label={siteName}
            className="inline-flex min-h-11 shrink-0 items-center"
          >
            <Wordmark className="text-body-lg" />
          </a>
        }
        language={<LanguageSwitcher />}
        labels={{ nav: t('home.sections'), menu: t('home.menu'), close: t('home.close') }}
      />

      <main>
        {/* --- Hero: the promise on the left, what is happening now on the right --- */}
        <section
          id="top"
          aria-labelledby="hero-heading"
          className="px-gutter pb-section pt-28 lg:flex lg:min-h-dvh lg:items-center"
        >
          <div className="max-w-page mx-auto grid w-full gap-14 lg:grid-cols-12 lg:items-center lg:gap-10">
            <div className="flex flex-col gap-8 lg:col-span-7">
              <h1
                id="hero-heading"
                data-testid="hero-heading"
                data-enter
                data-ok-headline
                className="text-display font-hero text-balance"
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
              <div data-enter className="flex flex-wrap items-center gap-3">
                <span data-magnetic className="inline-flex">
                  <CtaLink href={toInquiry} size="lg" icon="down">
                    {ctaLabel}
                  </CtaLink>
                </span>
                {showAcademy ? (
                  <a
                    href="#academy"
                    className="text-body-lg hover:text-primary inline-flex min-h-13 items-center gap-2 px-4 font-medium transition-colors"
                  >
                    {t('academy.title')}
                    <ArrowRightIcon aria-hidden />
                  </a>
                ) : null}
              </div>
            </div>
            {boardCards.length > 0 ? (
              <div data-enter className="lg:col-span-5">
                <LiveBoard
                  cards={boardCards}
                  labels={{
                    title: t('home.board.title'),
                    carousel: t('home.board.carousel'),
                    slide: t('home.board.slide'),
                    previous: t('home.previous'),
                    next: t('home.next'),
                    pause: t('home.board.pause'),
                    resume: t('home.board.resume'),
                  }}
                />
              </div>
            ) : null}
          </div>
        </section>

        {/* --- Who STAGER is: a statement, straight after the promise. A short
            intro is set large; a long one as reading text, never a void. --- */}
        {section.intro ? (
          <section id="about" aria-labelledby="about-title" className="px-gutter pb-section">
            <div className="max-w-page border-line mx-auto grid gap-6 border-t pt-10 lg:grid-cols-12 lg:gap-10 lg:pt-14">
              <h2
                id="about-title"
                className="text-body-lg text-ink-muted font-medium lg:col-span-3 lg:pt-3"
              >
                {section.intro.heading || t('nav.about')}
              </h2>
              <div className="flex flex-col gap-8 lg:col-span-9">
                {section.intro.subheading ? (
                  <p data-ok-lines className="ok-statement text-pretty">
                    {section.intro.subheading}
                  </p>
                ) : null}
                {isBlankHtml(section.intro.body) ? (
                  <PendingSlot
                    label={t('preview.pendingIntro')}
                    hint={t('preview.pendingHint')}
                    className="max-w-xl"
                  />
                ) : introIsStatement ? (
                  <div data-ok-lines>
                    <RichText html={section.intro.body} className="ok-statement text-pretty" />
                  </div>
                ) : (
                  <div data-reveal>
                    <RichText
                      html={section.intro.body}
                      className="text-title-lg max-w-4xl text-pretty"
                    />
                  </div>
                )}
                {section.intro.media ? (
                  <div data-reveal>
                    <MediaFrame
                      media={section.intro.media}
                      ratio="16/9"
                      sizes="(min-width: 1024px) 66vw, 100vw"
                      missingLabel={t('preview.photoSection')}
                      className="rounded-lg"
                    />
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
            className="px-gutter py-section bg-(--ok-band)"
          >
            <div className="max-w-page mx-auto flex flex-col gap-12 lg:gap-16">
              <div data-reveal>
                <SectionHeader
                  id="services-title"
                  title={servicesTitle}
                  description={section.services?.subheading}
                />
              </div>
              <ol
                data-journey
                className="ok-journey"
                style={{ '--steps': services.items.length } as CSSProperties}
              >
                {services.items.map((service) => {
                  const related = coursesByService.get(service.id);
                  return (
                    <li key={service.id} data-journey-step data-reveal className="ok-step">
                      <span aria-hidden className="ok-step-node">
                        {hasServiceIcon(service.icon) ? (
                          <ServiceIcon name={service.icon} weight="regular" />
                        ) : null}
                      </span>
                      <div className="ok-step-card">
                        <h3 className="text-title-sm xl:text-title font-heading text-balance">
                          {service.title}
                        </h3>
                        {service.shortDescription ? (
                          <p className="text-body text-ink-muted text-pretty">
                            {service.shortDescription}
                          </p>
                        ) : null}
                        {service.cover ? (
                          <MediaFrame
                            media={service.cover}
                            ratio="3/2"
                            sizes="(min-width: 1024px) 16rem, 80vw"
                            missingLabel={t('preview.photoSection')}
                            className="mt-1 rounded-(--ok-radius-thumb)"
                          />
                        ) : null}
                        {related ? (
                          <a href="#academy" className="ok-step-course">
                            <GraduationCapIcon aria-hidden className="mt-0.5 shrink-0" />
                            <span>{t('academy.related', { course: related.title })}</span>
                          </a>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>
        ) : null}

        {/* --- Projects: a rail to drag, scroll or step through --- */}
        {showProjects ? (
          <section id="projects" aria-labelledby="projects-title" className="py-section">
            {projects.items.length === 0 ? (
              <div className="px-gutter">
                <div className="max-w-page mx-auto flex flex-col gap-8">
                  <SectionHeader
                    id="projects-title"
                    title={projectsTitle}
                    description={section.projects?.subheading}
                  />
                  <p className="text-body-lg text-ink-muted">{t('home.noProjects')}</p>
                </div>
              </div>
            ) : (
              <ProjectRail
                label={projectsTitle}
                previousLabel={t('home.previous')}
                nextLabel={t('home.next')}
                header={
                  <SectionHeader
                    id="projects-title"
                    title={projectsTitle}
                    description={section.projects?.subheading}
                  />
                }
              >
                {projects.items.map((project, index) => {
                  const meta = joinMeta([project.client, project.location, project.year]);
                  return (
                    <li
                      key={project.id}
                      data-rail-card
                      className="w-(--ok-rail-card) shrink-0 snap-start"
                    >
                      <article className="group flex flex-col gap-5">
                        <div className="ease-brand group-hover:shadow-card relative aspect-4/3 overflow-hidden rounded-lg transition duration-500 group-hover:-translate-y-1">
                          {project.cover ? (
                            <MediaFrame
                              media={project.cover}
                              ratio="fill"
                              sizes="(min-width: 640px) 25rem, 82vw"
                              missingLabel={t('preview.photoProject')}
                              className="ease-brand absolute inset-0 size-full transition-transform duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <div
                              data-tone={TILE_TONES[index % TILE_TONES.length]}
                              className="ok-tile absolute inset-0 flex flex-col justify-between p-6"
                            >
                              <span className="text-display font-hero text-primary tabular-nums">
                                {project.year ?? project.title.slice(0, 1)}
                              </span>
                              {project.location ? (
                                <span className="text-body-sm text-ink-muted">
                                  {project.location}
                                </span>
                              ) : null}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <h3
                            data-testid="project-title"
                            className="text-title-sm font-heading text-balance"
                          >
                            {project.title}
                          </h3>
                          {meta ? <p className="text-body-sm text-ink-muted">{meta}</p> : null}
                          {project.summary ? (
                            <p className="text-body-sm text-ink-muted line-clamp-3 text-pretty">
                              {project.summary}
                            </p>
                          ) : null}
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ProjectRail>
            )}
          </section>
        ) : null}

        {/* --- STAGER Academy: its own ground, its own timetable --- */}
        {showAcademy ? (
          <section id="academy" aria-labelledby="academy-title" className="py-section sm:px-gutter">
            {/* Edge to edge on a phone, where every pixel of width counts. */}
            <div className="max-w-page mx-auto flex flex-col gap-10 bg-(--ok-academy) px-5 py-12 sm:rounded-xl sm:px-10 lg:px-16 lg:py-20">
              <div data-reveal>
                <SectionHeader
                  id="academy-title"
                  title={t('academy.title')}
                  description={t('academy.intro')}
                  badge={courses.sample ? sampleBadge : null}
                />
              </div>
              <div data-reveal>
                <AcademyTimetable
                  chips={chips}
                  filterLabel={t('academy.filterLabel')}
                  rows={courses.items.map((course) => {
                    const full = course.seatsLeft === 0;
                    const few =
                      course.seatsLeft !== null &&
                      course.seatsLeft > 0 &&
                      course.seatsLeft <= FEW_SEATS;
                    return {
                      id: course.id,
                      category: courseCategoryKey(course),
                      node: (
                        <article className="hover:bg-surface-raised/60 grid grid-cols-(--ok-row) items-start gap-x-5 gap-y-4 px-1 py-6 transition-colors sm:px-4 md:grid-cols-(--ok-row-md) lg:grid-cols-(--ok-row-lg) lg:items-center lg:gap-x-8">
                          {/* One line above the course on a phone; a column of its own from md. */}
                          <p className="flex items-baseline gap-2 md:flex-col md:items-start md:gap-0">
                            {course.startsAt ? (
                              <>
                                <span className="text-headline font-hero leading-none tabular-nums">
                                  {date(course.startsAt, { day: 'numeric' })}
                                </span>
                                <span className="text-body-sm font-semibold md:mt-1">
                                  {date(course.startsAt, { month: 'short' })}
                                </span>
                                <span className="text-caption text-ink-muted">
                                  {date(course.startsAt, { weekday: 'short' })}
                                </span>
                              </>
                            ) : (
                              <span className="text-body-sm font-semibold">
                                {t('academy.dateTba')}
                              </span>
                            )}
                          </p>
                          <div className="flex min-w-0 flex-col gap-3">
                            <h3 className="text-title-sm font-heading text-balance">
                              {course.title}
                            </h3>
                            <p className="text-body-sm text-ink-muted max-w-2xl text-pretty">
                              {course.summary}
                            </p>
                            <ul className="flex flex-wrap gap-2">
                              {course.category ? (
                                <li className={CHIP}>{course.category.name}</li>
                              ) : null}
                              <li className={CHIP}>
                                <ClockIcon aria-hidden />
                                {course.duration}
                              </li>
                              <li className={CHIP}>
                                <CoursePlaceIcon course={course} />
                                {course.location ?? t(`academy.formats.${course.format}`)}
                              </li>
                            </ul>
                          </div>
                          <div className="flex items-baseline justify-between gap-4 md:col-span-2 lg:col-span-1 lg:flex-col lg:items-start lg:gap-1">
                            <p className="text-title-sm font-heading tabular-nums">
                              {price(course.priceGel)}
                            </p>
                            <p
                              className={cn(
                                'text-body-sm',
                                few ? 'text-primary font-semibold' : 'text-ink-muted',
                              )}
                            >
                              {seats(course.seatsLeft)}
                            </p>
                          </div>
                          <div className="md:col-span-2 lg:col-span-1 lg:justify-self-end">
                            <RegisterButton
                              course={registration(course)}
                              className={cn(
                                full ? BUTTON_OUTLINE : BUTTON_PRIMARY,
                                'w-full lg:w-auto',
                              )}
                            >
                              {full ? t('academy.waitlist') : t('academy.register')}
                            </RegisterButton>
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

        {/* --- Videos: a player and its playlist --- */}
        {showVideos ? (
          <section id="videos" aria-labelledby="videos-title" className="px-gutter py-section">
            <div className="max-w-page mx-auto flex flex-col gap-12">
              <div data-reveal>
                <SectionHeader
                  id="videos-title"
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
              </div>
              <div data-reveal>
                <VideoPlaylist
                  videos={videos.items.map((video) => ({
                    id: video.id,
                    title: video.title,
                    summary: video.summary,
                    meta: joinMeta([
                      video.kind ? t(`videos.kinds.${video.kind}`) : null,
                      minutes(video.durationMinutes),
                      date(video.publishedAt, { day: 'numeric', month: 'long' }),
                    ]),
                    playLabel: t('videos.playTitle', { title: video.title }),
                    youtubeId: youtubeId(video.youtubeUrl),
                    youtubeUrl: video.youtubeUrl,
                    youtubeLabel: t('videos.watchOnYouTube', { title: video.title }),
                    poster: (
                      <VideoPoster
                        youtubeUrl={video.youtubeUrl}
                        sizes="(min-width: 1024px) 55vw, 100vw"
                        placeholder={<PosterPlaceholder kind={video.kind} />}
                      />
                    ),
                    thumb: (
                      <VideoPoster
                        youtubeUrl={video.youtubeUrl}
                        sizes="8rem"
                        placeholder={<PosterPlaceholder kind={video.kind} />}
                      />
                    ),
                  }))}
                  labels={{
                    list: t('videos.list'),
                    nowPlaying: t('videos.nowPlaying'),
                    unavailable: t('videos.unavailable'),
                  }}
                />
              </div>
            </div>
          </section>
        ) : null}

        {/* --- Why STAGER: the heading stays while the reasons are read --- */}
        {section.why ? (
          <section id="why" aria-labelledby="why-title" className="px-gutter py-section">
            <div className="max-w-page mx-auto grid gap-10 lg:grid-cols-12 lg:gap-10">
              <div className="lg:col-span-5">
                <div className="flex flex-col gap-5 lg:sticky lg:top-32">
                  <h2 id="why-title" className={H2}>
                    {whyTitle}
                  </h2>
                  {section.why.subheading ? (
                    <p className={DESCRIPTION}>{section.why.subheading}</p>
                  ) : null}
                </div>
              </div>
              <div className="lg:col-span-7">
                {isBlankHtml(section.why.body) ? (
                  <PendingSlot
                    label={t('preview.pendingWhy')}
                    hint={t('preview.pendingHint')}
                    className="max-w-xl"
                  />
                ) : (
                  <div data-reveal>
                    <RichText html={section.why.body} className="ok-why text-lead text-pretty" />
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : null}

        {/* --- Insights: one large, two beside it --- */}
        {showInsights ? (
          <section id="insights" aria-labelledby="insights-title" className="px-gutter py-section">
            <div className="max-w-page mx-auto flex flex-col gap-12">
              <div data-reveal>
                <SectionHeader
                  id="insights-title"
                  title={insightsTitle}
                  description={section.insights?.subheading}
                />
              </div>
              <ul className="grid gap-6 lg:grid-cols-12 lg:gap-x-10">
                {insights.items.map((insight, index) => {
                  const lead = index === 0;
                  const meta = joinMeta([
                    insight.category?.name,
                    insight.publishedAt ? longDate(insight.publishedAt) : null,
                  ]);
                  return (
                    <li
                      key={insight.id}
                      data-reveal
                      className={cn(lead ? 'lg:col-span-7 lg:row-span-2' : 'lg:col-span-5')}
                    >
                      <article
                        className={cn(
                          'flex h-full flex-col gap-4',
                          lead
                            ? 'bg-surface-muted rounded-lg p-6 sm:p-10'
                            : 'border-line-strong border-t pt-6',
                        )}
                      >
                        {lead && insight.cover ? (
                          <MediaFrame
                            media={insight.cover}
                            ratio="3/2"
                            sizes="(min-width: 1024px) 50vw, 100vw"
                            missingLabel={t('preview.photoSection')}
                            className="rounded-lg"
                          />
                        ) : null}
                        {meta ? <p className="text-body-sm text-ink-muted">{meta}</p> : null}
                        <h3
                          className={cn(
                            'font-heading text-balance',
                            lead ? 'text-title-lg' : 'text-title',
                          )}
                        >
                          {insight.title}
                        </h3>
                        {insight.excerpt ? (
                          <p
                            className={cn(
                              'text-ink-muted text-pretty',
                              lead ? 'text-body-lg' : 'text-body line-clamp-3',
                            )}
                          >
                            {insight.excerpt}
                          </p>
                        ) : null}
                      </article>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        ) : null}

        {/* --- The inquiry --- */}
        <section
          id={INQUIRY_ANCHOR}
          aria-labelledby={`${INQUIRY_ANCHOR}-title`}
          className="px-gutter py-section"
        >
          <div className="max-w-page mx-auto grid gap-12 lg:grid-cols-12 lg:gap-10">
            <div data-reveal className="flex flex-col gap-6 lg:col-span-5">
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
            <div data-reveal className="lg:col-span-7">
              <div className="bg-surface-raised border-line shadow-card rounded-lg border p-6 sm:p-10">
                <InquiryForm locale={locale} submitLabel={ctaLabel} layout="two-column" />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-gutter pt-section pb-6">
        <div className="bg-surface-muted max-w-page @container mx-auto flex flex-col gap-12 overflow-hidden rounded-xl px-6 pt-12 sm:px-10 lg:px-16 lg:pt-16">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="flex flex-col gap-3 md:col-span-5">
              <Wordmark testId="footer-wordmark" className="text-title-sm" />
              {layout?.tagline ? (
                <p className="text-body text-ink-muted max-w-sm text-pretty">{layout.tagline}</p>
              ) : null}
            </div>
            <nav aria-label={t('home.sections')} className="md:col-span-4">
              <ul className="grid grid-cols-2 gap-x-6">
                {links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-body text-ink-muted hover:text-ink inline-flex min-h-11 items-center transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="flex flex-col gap-4 md:col-span-3">
              <ContactDetails
                email={layout?.contactEmail ?? null}
                phone={layout?.phone ?? null}
                address={null}
              />
              <SocialLinks links={layout?.socialLinks ?? []} />
            </div>
          </div>
          <p
            aria-hidden
            data-ok-footer-mark
            className="ok-footer-mark font-hero text-center whitespace-nowrap select-none"
          >
            STAGER
          </p>
        </div>
        <div className="max-w-page text-body-sm text-ink-muted mx-auto flex flex-col gap-1 px-6 pt-5 sm:flex-row sm:justify-between sm:px-10 lg:px-16">
          <p>
            © {new Date().getFullYear()} {siteName}
          </p>
          <p>{t('home.rights')}</p>
        </div>
      </footer>

      <RegistrationDialog locale={locale} />
    </OpenKitchenMotion>
  );
}
