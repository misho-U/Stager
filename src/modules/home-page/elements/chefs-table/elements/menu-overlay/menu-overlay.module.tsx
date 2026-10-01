'use client';

import { ListIcon } from '@phosphor-icons/react/dist/csr/List';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';

import {
  MENU_PANEL_ID,
  useMenuButton,
  useMenuPanel,
} from '@/modules/home-page/elements/chefs-table/elements/menu-overlay/menu-overlay.service';

/** The header's menu button. */
export function MenuButton({ label }: { label: string }) {
  const { open, show } = useMenuButton();
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={MENU_PANEL_ID}
      onClick={show}
      className="text-body-sm text-ink border-ink hover:bg-primary hover:text-on-primary inline-flex min-h-11 items-center gap-2 border px-4 font-medium"
    >
      <ListIcon aria-hidden weight="bold" />
      {label}
    </button>
  );
}

type MenuPanelProps = {
  items: ReadonlyArray<{ href: string; label: string }>;
  closeLabel: string;
  /** The dialog's accessible name. */
  title: string;
};

/** The full-screen menu: the page's sections as big links on teal, rising in one after another. */
export function MenuPanel({ items, closeLabel, title }: MenuPanelProps) {
  const { open, close, follow, panel } = useMenuPanel();

  return (
    <div
      ref={panel}
      id={MENU_PANEL_ID}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      hidden={!open}
      data-surface="inverse"
      className="fixed inset-0 z-(--z-overlay) overflow-y-auto"
    >
      <div className="max-w-page px-gutter mx-auto flex min-h-full flex-col py-4">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={close}
            className="text-body-sm text-ink border-line-strong hover:bg-primary hover:text-on-primary inline-flex min-h-11 items-center gap-2 border px-4 font-medium transition-colors"
          >
            <XIcon aria-hidden weight="bold" />
            {closeLabel}
          </button>
        </div>
        <nav aria-label={title} className="flex flex-1 items-center py-16">
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.href} className="overflow-hidden">
                <a
                  href={item.href}
                  data-menu-link
                  onClick={(event) => {
                    event.preventDefault();
                    follow(item.href);
                  }}
                  className="text-headline font-heading hover:text-ink-muted block pt-1 pb-3 leading-tight text-balance transition-colors"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
