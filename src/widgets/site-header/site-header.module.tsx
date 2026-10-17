'use client';

import { ArrowRightIcon } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { ListIcon } from '@phosphor-icons/react/dist/csr/List';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';

import { SiteLink } from '@/shared/components/site-link';
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
 * a dark glass pill once the page moves, and a compact menu that drops from
 * its button: the sections and pages, then the language and the call to
 * action. The menu lives outside the header, which ignores the pointer
 * except over its own bar.
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
  const { dialog, trigger, open, close, onClose, onDialogClick, follow } = useMenu();
  const hasMenu = links.length > 0;
  // The call to action is the button at the menu's foot; listed again among
  // the sections it was the same thing twice.
  const listed = links.filter((link) => link.href !== cta.href);
  /**
   * A link to a section of this page glides there. Any other is followed
   * without a reload (SiteLink), so the menu closes first: the page it sits
   * on may stay (a link to this very page), and a closed menu hands the
   * scroll back.
   */
  const onMenuLink = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isInPageLink(href)) {
      close();
      return;
    }
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
            'ct-bar pointer-events-auto mx-auto flex items-center justify-between gap-2 rounded-full sm:gap-3',
            scrolled
              ? 'h-(--ct-pill-h) max-w-[min(var(--ct-pill-w),100%-2*var(--ct-pill-inset))] pr-2 pl-4 sm:pl-6'
              : // Capped at the bar's own width, so a phone's bar shrinks
                // through the whole transition, not only at its very end.
                'h-(--ct-header-h) max-w-[min(var(--container-page),100%)]',
          )}
        >
          {brand}
          <div className="flex shrink-0 items-center gap-2">
            <div className="ct-lang">{language}</div>
            <SiteLink
              href={cta.href}
              data-magnetic
              className="bg-primary text-on-primary hover:bg-primary-hover text-body-sm hidden min-h-11 items-center rounded-full px-5 font-medium whitespace-nowrap transition-colors md:inline-flex"
            >
              {cta.label}
            </SiteLink>
            {hasMenu ? (
              <button
                ref={trigger}
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
          onClick={onDialogClick}
          aria-labelledby="ct-menu-title"
          data-lenis-prevent
          className="ct-menu"
        >
          <div className="flex flex-col gap-4 p-4 sm:gap-5 sm:p-5">
            <div className="flex items-center justify-end gap-4">
              <h2 id="ct-menu-title" className="sr-only">
                {labels.menu}
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label={labels.close}
                className="hover:bg-surface-muted -mr-1 inline-flex size-11 items-center justify-center rounded-full transition-colors"
              >
                <XIcon aria-hidden weight="bold" />
              </button>
            </div>
            <nav aria-label={labels.nav}>
              <ol className="ct-menu-links">
                {listed.map((link, index) => (
                  <li key={link.href} style={{ '--i': index } as CSSProperties}>
                    <SiteLink
                      href={link.href}
                      data-menu-link
                      aria-current={link.href === current ? 'page' : undefined}
                      onClick={onMenuLink(link.href)}
                    >
                      <span aria-hidden className="ct-menu-index">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="ct-menu-label">{link.label}</span>
                      <ArrowRightIcon aria-hidden className="ct-menu-arrow" />
                    </SiteLink>
                  </li>
                ))}
              </ol>
            </nav>
            {teaser}
            <div className="flex items-center gap-3">
              <div className="ct-lang">{menuLanguage}</div>
              <SiteLink
                href={cta.href}
                onClick={onMenuLink(cta.href)}
                className="bg-primary text-on-primary hover:bg-primary-hover text-body-sm inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-5 font-medium whitespace-nowrap transition-colors"
              >
                {cta.label}
                <ArrowRightIcon aria-hidden />
              </SiteLink>
            </div>
          </div>
        </dialog>
      ) : null}
    </>
  );
}
