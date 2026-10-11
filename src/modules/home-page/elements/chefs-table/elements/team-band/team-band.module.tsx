import { LinkedinLogoIcon } from '@phosphor-icons/react/dist/ssr/LinkedinLogo';

import type { PublicTeamMember } from '@/entity/team-member/model/team-member.model';
import { MediaFrame } from '@/shared/components/media-frame';
import { cn } from '@/shared/lib/cn';

type TeamBandProps = {
  members: readonly PublicTeamMember[];
  labels: { title: string; linkedin: (name: string) => string; photo: string };
  /** Directly under the intro, which then supplies the space above. */
  followsIntro: boolean;
};

/**
 * "Lika Gulua" is LG: the mark of a member whose photo is not in yet. Taken
 * as written, never upper-cased: that would turn Georgian letters into
 * Mtavruli capitals, which the site never sets.
 */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('');
}

/**
 * The people behind STAGER, right after the intro, in the intro's own grid:
 * a quiet label on the left, one member to a row on the right, the portrait
 * beside the name, the role and the bio. About and Team live here rather
 * than on pages of their own (the client's call: one page).
 */
export function TeamBand({ members, labels, followsIntro }: TeamBandProps) {
  return (
    <section
      id="team"
      aria-labelledby="team-title"
      className={cn('px-gutter pb-section', !followsIntro && 'pt-section')}
    >
      <div className="max-w-page mx-auto grid gap-8 lg:grid-cols-12 lg:gap-10">
        <h2
          id="team-title"
          className="text-title font-heading stretch-heading text-ink-muted lg:col-span-3 lg:pt-2"
        >
          {labels.title}
        </h2>
        <ul data-testid="team-list" className="flex flex-col gap-12 lg:col-span-9">
          {members.map((member) => (
            <li key={member.id} data-reveal className="ct-member">
              <div className="ct-member-photo relative overflow-hidden rounded-lg">
                {member.photo ? (
                  <MediaFrame
                    media={member.photo}
                    ratio="4/5"
                    sizes="(min-width: 640px) 14rem, 60vw"
                    missingLabel={labels.photo}
                  />
                ) : (
                  <div
                    aria-hidden
                    className="ct-poster grid aspect-4/5 place-items-center rounded-lg"
                  >
                    <span className="text-headline font-heading text-ink">
                      {initialsOf(member.name)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex max-w-2xl flex-col gap-2">
                <h3 className="text-title font-heading text-balance">{member.name}</h3>
                {member.position ? (
                  <p className="text-body text-accent">{member.position}</p>
                ) : null}
                {member.bio ? (
                  <p className="text-body text-ink-muted mt-2 text-pretty whitespace-pre-line">
                    {member.bio}
                  </p>
                ) : null}
                {member.linkedinUrl ? (
                  <a
                    href={member.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={labels.linkedin(member.name)}
                    className="text-ink-muted hover:text-ink mt-2 inline-flex size-11 items-center justify-center self-start rounded-full transition-colors"
                  >
                    <LinkedinLogoIcon aria-hidden size="1.5em" />
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
