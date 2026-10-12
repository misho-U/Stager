'use client';

import { ListIcon } from '@phosphor-icons/react/dist/csr/List';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';
import type { MouseEvent, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';
import { isInPageLink } from '@/widgets/site-header/site-header.constants';
import { useMenu, useScrolled } from '@/widgets/site-header/site-header.service';

type Link = { href: string; label: string };

type SiteHeaderProps = {
  /**
   * The sections the menu lists, in page order: `#id` links on the home page,
   * `/{locale}#id` from any other. None, and the header has no menu.
   */
  links: readonly Link[];
  /** "Start a Project": the one contact action. */
  cta: Link;
  /** The wordmark, linking to the top of the home page. */
  brand: ReactNode;
  /** The language switch, rendered by the caller: once for the bar, once for the menu. */
  language: ReactNode;
  menuLanguage: ReactNode;
  /** Shown beside the links in the menu: what is next at the Academy. */
  teaser?: ReactNode;
  /** The link to the page being shown, if the menu lists it: marked as current. */
  current?: string | null;
  labels: { nav: string; menu: string; close: string };
};

const OUTLINE_BUTTON =
  'border-line-input hover:bg-surface-muted inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-body-sm font-medium transition-colors';

/**
 * The site's header: a clear bar over the top of the page that gathers into
 * a dark glass pill once the page moves, and a full-screen menu with the home
 * page's sections set large. The menu lives outside the header, which ignores
 * the pointer except over its own bar.
 */
export function SiteHeader({
  links,
  cta,
  brand,
  language,
  menuLanguage,
  teaser,
  current = null,
  labels,
}: SiteHeaderProps) {
  const { marker, scrolled } = useScrolled();
  const { dialog, open, close, onClose, follow } = useMenu();
  const hasMenu = links.length > 0;
  /** A link to a section of this page glides there; any other is followed. */
  const onMenuLink = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isInPageLink(href)) return;
    event.preventDefault();
    follow(href);
  };

  return (
    <>
      <div ref={marker} aria-hidden className="absolute top-0 left-0 h-16 w-px" />
      <header
        data-ct-header
        data-scrolled={scrolled ? '' : undefined}
        className="px-gutter pointer-events-none fixed inset-x-0 top-3 z-(--z-header)"
      >
        <div
          className={cn(
            'ease-brand pointer-events-auto mx-auto flex items-center justify-between gap-3 rounded-full transition-all duration-500',
            scrolled
              ? 'ct-glass shadow-card h-(--ct-pill-h) max-w-3xl pr-2 pl-6'
              : 'max-w-page h-(--ct-header-h)',
          )}
        >
          {brand}
          <div className="flex items-center gap-2">
            <div className="ct-lang">{language}</div>
            <a
              href={cta.href}
              data-magnetic
              className="bg-primary text-on-primary hover:bg-primary-hover text-body-sm hidden min-h-11 items-center rounded-full px-5 font-medium whitespace-nowrap transition-colors md:inline-flex"
            >
              {cta.label}
            </a>
            {hasMenu ? (
              <button
                type="button"
                onClick={open}
                aria-haspopup="dialog"
                className={OUTLINE_BUTTON}
              >
                <ListIcon aria-hidden weight="bold" />
                <span className="max-sm:sr-only">{labels.menu}</span>
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {hasMenu ? (
        <dialog
          ref={dialog}
          onClose={onClose}
          aria-labelledby="ct-menu-title"
          data-lenis-prevent
          className="ct-fullscreen ct-menu"
        >
          <div className="px-gutter max-w-page mx-auto flex min-h-full flex-col gap-10 py-6">
            <div className="flex h-(--ct-header-h) items-center justify-between">
              <p id="ct-menu-title" className="text-body-sm text-ink-muted font-medium">
                {labels.menu}
              </p>
              <button type="button" onClick={close} className={OUTLINE_BUTTON}>
                <XIcon aria-hidden weight="bold" />
                <span className="max-sm:sr-only">{labels.close}</span>
              </button>
            </div>
            <div className="grid flex-1 content-center gap-14 lg:grid-cols-12 lg:items-end">
              <nav aria-label={labels.nav} className="lg:col-span-7">
                <ul className="flex flex-col">
                  {links.map((link) => (
                    <li key={link.href} className="overflow-hidden">
                      <a
                        href={link.href}
                        data-menu-link
                        aria-current={link.href === current ? 'page' : undefined}
                        onClick={onMenuLink(link.href)}
                        className="text-headline font-hero stretch-hero hover:text-accent block pt-1 pb-2 transition-colors"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="flex flex-col gap-6 lg:col-span-5">
                {teaser}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="ct-lang">{menuLanguage}</div>
                  <a
                    href={cta.href}
                    onClick={onMenuLink(cta.href)}
                    className="bg-primary text-on-primary hover:bg-primary-hover text-body inline-flex min-h-12 items-center rounded-full px-6 font-medium whitespace-nowrap transition-colors"
                  >
                    {cta.label}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </dialog>
      ) : null}
    </>
  );
}
