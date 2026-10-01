'use client';

import { ListIcon } from '@phosphor-icons/react/dist/csr/List';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';
import type { ReactNode } from 'react';

import {
  useMenuDialog,
  useScrollSpy,
  useSpyIndicator,
} from '@/modules/home-page/elements/open-kitchen/elements/ok-header/ok-header.service';

type Link = { href: string; label: string };

type OkHeaderProps = {
  /** The page's sections, as `#id` links, in page order. */
  links: readonly Link[];
  /** "Start a Project": the one contact action. */
  cta: Link;
  /** The wordmark, linking to the top. */
  brand: ReactNode;
  /** The language switch, rendered by the caller. */
  language: ReactNode;
  labels: { nav: string; menu: string; close: string };
};

/**
 * The floating header: a frosted pill over the page with the section links,
 * a pill behind the link of the section in view, the language switch and the
 * call to action. Below `xl` the links move into a full-screen menu.
 */
export function OkHeader({ links, cta, brand, language, labels }: OkHeaderProps) {
  const active = useScrollSpy(links.map((link) => link.href.slice(1)));
  const { list, indicator } = useSpyIndicator(active);
  const { dialog, open, close, onClose, follow } = useMenuDialog();

  return (
    <>
      <header
        data-ok-header
        className="px-gutter pointer-events-none fixed inset-x-0 top-(--ok-header-top) z-(--z-header)"
      >
        <div className="ok-float border-line max-w-page pointer-events-auto mx-auto flex h-(--ok-header-h) items-center justify-between gap-3 rounded-full border py-2 pr-2 pl-5 sm:pl-6">
          {brand}

          <nav aria-label={labels.nav} className="relative hidden xl:block">
            <span
              ref={indicator}
              aria-hidden
              data-decorative
              className="bg-surface-muted ease-brand absolute top-0 left-0 h-full rounded-full opacity-0 transition-all duration-300"
            />
            <ul ref={list} className="flex items-center gap-1">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    aria-current={active === link.href.slice(1) ? 'true' : undefined}
                    className="text-body-sm text-ink-muted hover:text-ink aria-[current=true]:text-ink relative inline-flex min-h-11 items-center rounded-full px-4 font-medium whitespace-nowrap transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <div className="ok-lang">{language}</div>
            <a
              href={cta.href}
              data-magnetic
              className="bg-primary text-on-primary hover:bg-primary-hover text-body-sm hidden min-h-11 items-center rounded-full px-5 font-medium whitespace-nowrap transition-colors md:inline-flex"
            >
              {cta.label}
            </a>
            <button
              type="button"
              onClick={open}
              aria-haspopup="dialog"
              aria-label={labels.menu}
              className="border-line-input hover:bg-surface-muted inline-flex size-11 items-center justify-center rounded-full border transition-colors xl:hidden"
            >
              <ListIcon aria-hidden weight="bold" />
            </button>
          </div>
        </div>
      </header>

      {/* Outside the header: it ignores the pointer except over its pill, and
          the menu would inherit that. */}
      <dialog
        ref={dialog}
        onClose={onClose}
        aria-labelledby="ok-menu-title"
        data-lenis-prevent
        className="ok-menu bg-surface text-ink"
      >
        <div className="px-gutter flex min-h-full flex-col pt-(--ok-header-top) pb-8">
          <div className="flex h-(--ok-header-h) items-center justify-between pl-5">
            <p id="ok-menu-title" className="text-body-sm text-ink-muted font-medium">
              {labels.menu}
            </p>
            <button
              type="button"
              onClick={close}
              aria-label={labels.close}
              className="border-line-input hover:bg-surface-muted inline-flex size-11 items-center justify-center rounded-full border transition-colors"
            >
              <XIcon aria-hidden weight="bold" />
            </button>
          </div>
          <nav aria-label={labels.nav} className="flex-1 py-10">
            <ul className="flex flex-col gap-1">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={(event) => {
                      event.preventDefault();
                      follow(link.href);
                    }}
                    className="text-headline font-heading hover:text-primary block py-2 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <a
            href={cta.href}
            onClick={(event) => {
              event.preventDefault();
              follow(cta.href);
            }}
            className="bg-primary text-on-primary hover:bg-primary-hover text-body-lg inline-flex min-h-13 items-center justify-center rounded-full px-7 font-medium transition-colors"
          >
            {cta.label}
          </a>
        </div>
      </dialog>
    </>
  );
}
