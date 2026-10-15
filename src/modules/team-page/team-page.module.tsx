import { LinkedinLogoIcon } from '@phosphor-icons/react/dist/ssr/LinkedinLogo';
import { getTranslations } from 'next-intl/server';

import { pageIntro, pageName } from '@/entity/page/model/page.model';
import { TEAM_PATH } from '@/entity/team-member/model/team-member.model';
import {
  initialsOf,
  loadTeamPageData,
  teamStructuredData,
} from '@/modules/team-page/team-page.service';
import { MediaFrame } from '@/shared/components/media-frame';
import type { DbLocale } from '@/shared/types/enums';
import { toAppLocale } from '@pkg/i18n/routing';
import { JsonLd } from '@/widgets/seo/seo.module';
import { PageHero, SubpageShell } from '@/widgets/site-chrome/site-chrome.module';

type TeamPageModuleProps = { locale: DbLocale };

/**
 * The people behind STAGER (dashboard → Team), each a portrait over their
 * name, role and bio, three to a row on a wide screen. The page's heading
 * and the line under it are written under Page copy → Team.
 */
export async function TeamPageModule({ locale }: TeamPageModuleProps) {
  const [content, t] = await Promise.all([loadTeamPageData(locale), getTranslations()]);
  const { chrome, page, members } = content;
  const intro = pageIntro(page);
  const title = pageName(page, t('nav.team'));

  return (
    <SubpageShell
      locale={locale}
      chrome={chrome}
      current={`/${toAppLocale(locale)}${TEAM_PATH}`}
    >
      <JsonLd
        data={teamStructuredData(content, locale, { home: t('nav.home'), team: t('nav.team') })}
      />
      <PageHero title={title} lead={intro.lead} testId="team-title" />
      <div className="px-gutter pb-section">
        <div className="max-w-page mx-auto">
          {members.length === 0 ? (
            <p className="text-body-lg text-ink-muted">{t('team.empty')}</p>
          ) : (
            <ul
              data-testid="team-list"
              className="grid gap-x-6 gap-y-16 sm:grid-cols-2 lg:grid-cols-3"
            >
              {members.map((member) => (
                <li key={member.id} data-reveal>
                  <article className="flex flex-col gap-5">
                    <div className="ct-spot relative overflow-hidden rounded-lg">
                      {member.photo ? (
                        <MediaFrame
                          media={member.photo}
                          ratio="4/5"
                          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"
                          missingLabel={t('preview.photoTeam')}
                        />
                      ) : (
                        <div aria-hidden className="ct-poster grid aspect-4/5 place-items-center">
                          <span className="text-headline font-heading text-ink">
                            {initialsOf(member.name)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <h2 className="text-title font-heading stretch-heading text-balance">
                        {member.name}
                      </h2>
                      {member.position ? (
                        <p className="text-body text-accent">{member.position}</p>
                      ) : null}
                      {member.bio ? (
                        <p className="text-body text-ink-muted mt-2 text-pretty whitespace-pre-line">
                          {member.bio}
                        </p>
                      ) : null}
                      {member.expertise ? (
                        <p className="text-body-sm text-ink-subtle border-line mt-2 border-t pt-4 text-pretty whitespace-pre-line">
                          {member.expertise}
                        </p>
                      ) : null}
                      {member.linkedinUrl ? (
                        <a
                          href={member.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={t('home.linkedin', { name: member.name })}
                          className="text-ink-muted hover:text-ink -ml-3 inline-flex size-11 items-center justify-center self-start rounded-full transition-colors"
                        >
                          <LinkedinLogoIcon aria-hidden size="1.5em" />
                        </a>
                      ) : null}
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SubpageShell>
  );
}
