import { ArrowUpRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowUpRight';
import { FacebookLogoIcon } from '@phosphor-icons/react/dist/ssr/FacebookLogo';
import { InstagramLogoIcon } from '@phosphor-icons/react/dist/ssr/InstagramLogo';
import { LinkedinLogoIcon } from '@phosphor-icons/react/dist/ssr/LinkedinLogo';
import { TiktokLogoIcon } from '@phosphor-icons/react/dist/ssr/TiktokLogo';
import { XLogoIcon } from '@phosphor-icons/react/dist/ssr/XLogo';
import { YoutubeLogoIcon } from '@phosphor-icons/react/dist/ssr/YoutubeLogo';

import { cn } from '@/shared/lib/cn';
import type { SocialPlatform } from '@/shared/types/enums';

const ICONS: Record<SocialPlatform, typeof ArrowUpRightIcon> = {
  FACEBOOK: FacebookLogoIcon,
  INSTAGRAM: InstagramLogoIcon,
  LINKEDIN: LinkedinLogoIcon,
  YOUTUBE: YoutubeLogoIcon,
  TIKTOK: TiktokLogoIcon,
  X: XLogoIcon,
  OTHER: ArrowUpRightIcon,
};

const NAMES: Record<SocialPlatform, string> = {
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  LINKEDIN: 'LinkedIn',
  YOUTUBE: 'YouTube',
  TIKTOK: 'TikTok',
  X: 'X',
  OTHER: 'Link',
};

type SocialLink = { id: string; platform: SocialPlatform; url: string; label: string | null };

/**
 * The active social links from the dashboard. Renders nothing when there are
 * none — the seeded placeholders are inactive, so nothing broken shows.
 */
export function SocialLinks({
  links,
  showLabels = false,
  className,
}: {
  links: readonly SocialLink[];
  showLabels?: boolean;
  className?: string;
}) {
  if (links.length === 0) return null;

  return (
    <ul className={cn('flex flex-wrap items-center gap-x-5 gap-y-2', className)}>
      {links.map((link) => {
        const Icon = ICONS[link.platform];
        const name = link.label ?? NAMES[link.platform];
        return (
          <li key={link.id}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={showLabels ? undefined : name}
              className="text-ink-muted hover:text-ink inline-flex min-h-11 items-center gap-2 transition-colors"
            >
              <Icon aria-hidden size="1.25em" />
              {showLabels ? <span className="text-body-sm">{name}</span> : null}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
