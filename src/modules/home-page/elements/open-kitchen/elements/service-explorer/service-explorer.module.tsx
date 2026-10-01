'use client';

import { ArrowRightIcon } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown';
import type { CSSProperties, ReactNode } from 'react';

import { useServiceExplorer } from '@/modules/home-page/elements/open-kitchen/elements/service-explorer/service-explorer.service';

export type ExplorerItem = {
  id: string;
  /** The service's icon and title, as shown in the list. */
  tab: ReactNode;
  /** What opens: picture, description, the matching course. */
  panel: ReactNode;
};

/**
 * The services, explorable where they stand: a list of services and the open
 * one's panel. One list of disclosure buttons serves both layouts (the CSS in
 * open-kitchen.css moves the open panel into a sticky right-hand column from
 * lg), so the markup and the keyboard behaviour are the same everywhere.
 */
export function ServiceExplorer({ items }: { items: readonly ExplorerItem[] }) {
  const { root, open, toggle, hover, leave } = useServiceExplorer(items[0]?.id ?? null);

  return (
    <div ref={root} data-explorer style={{ '--explorer-rows': items.length } as CSSProperties}>
      {items.map((item) => {
        const expanded = open === item.id;
        const panelId = `service-panel-${item.id}`;
        const tabId = `service-tab-${item.id}`;
        return (
          <div key={item.id} data-explorer-item>
            <h3 data-explorer-tab className="border-line border-b">
              <button
                id={tabId}
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                onPointerEnter={() => hover(item.id)}
                onPointerLeave={leave}
                className="group text-ink-muted hover:text-ink aria-expanded:text-ink flex min-h-11 w-full items-center gap-4 py-5 text-left transition-colors"
              >
                {item.tab}
                <CaretDownIcon
                  aria-hidden
                  weight="bold"
                  className="ml-auto shrink-0 transition-transform group-aria-expanded:rotate-180 lg:hidden"
                />
                <ArrowRightIcon
                  aria-hidden
                  weight="bold"
                  className="text-primary ml-auto hidden shrink-0 opacity-0 transition-opacity group-aria-expanded:opacity-100 lg:block"
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={tabId}
              data-explorer-panel={item.id}
              hidden={!expanded}
              className="pt-2 pb-8 lg:p-0"
            >
              {item.panel}
            </div>
          </div>
        );
      })}
    </div>
  );
}
