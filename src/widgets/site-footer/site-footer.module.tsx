import { cacheLife } from 'next/cache';

import type { PublicLayoutData } from '@/entity/site-setting/model/site-setting.model';
import { ContactDetails } from '@/shared/components/contact-details';
import { SocialLinks } from '@/shared/components/social-links';
import { Wordmark } from '@/shared/components/wordmark';

type Link = { href: string; label: string };

type SiteFooterProps = {
  /** The site's settings. */
  layout: PublicLayoutData | null;
  /** The sections to list, as the header's menu lists them. */
  links: readonly Link[];
  /** The privacy policy, once it has text; until then no link to an empty page. */
  privacy: Link | null;
  /** The link to the page being shown, if listed: marked as current. */
  current?: string | null;
  labels: { sections: string; rights: string };
};

/**
 * The site's footer: the wordmark and tagline, the sections, the contact
 * lines, "STAGER" drawn in outline across it (decoration, risen by the home
 * page's motion), and the small print.
 */
export function SiteFooter({ layout, links, privacy, current = null, labels }: SiteFooterProps) {
  const siteName = layout?.siteName || 'STAGER';

  return (
    <footer className="px-gutter pt-section pb-6">
      <div className="max-w-page @container mx-auto flex flex-col gap-12 overflow-hidden">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="flex flex-col gap-3 md:col-span-5">
            <Wordmark testId="footer-wordmark" className="text-title-sm" />
            {layout?.tagline ? (
              <p className="text-body text-ink-muted max-w-sm text-pretty">{layout.tagline}</p>
            ) : null}
          </div>
          <nav aria-label={labels.sections} className="md:col-span-4">
            <ul className="grid grid-cols-2 gap-x-6">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    aria-current={link.href === current ? 'page' : undefined}
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
          data-decorative
          data-ct-footer-mark
          className="ct-footer-mark font-hero stretch-hero text-center whitespace-nowrap select-none"
        >
          STAGER
        </p>
        <div className="border-line text-body-sm text-ink-muted flex flex-col gap-1 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © <CopyrightYear /> {siteName}
          </p>
          <div className="flex flex-wrap items-center gap-x-6">
            {privacy ? (
              <a
                href={privacy.href}
                data-testid="privacy-link"
                className="hover:text-ink inline-flex min-h-11 items-center underline-offset-4 transition-colors hover:underline"
              >
                {privacy.label}
              </a>
            ) : null}
            <p>{labels.rights}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

/**
 * This year, for the small print. Read from the clock inside a cache scope,
 * since a page built ahead of time may not read it outside one, and
 * refreshed daily, so the page shows the new year within a day.
 */
async function CopyrightYear() {
  'use cache';
  cacheLife('days');

  return new Date().getFullYear();
}
