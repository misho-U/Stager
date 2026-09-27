import { cn } from '@/shared/lib/cn';

type DesignVariantSwitcherProps = {
  current: string;
  variants: ReadonlyArray<{ id: string; label: string }>;
  /** The query parameter that selects a design, e.g. `v` for `?v=b`. */
  param: string;
};

/**
 * TEMPORARY — the bar for comparing the home page designs. Delete this folder
 * once one is chosen.
 *
 * In Georgian, for the client. Every button is a plain link (`?v=b`), so it
 * works without JavaScript and any of them can be copied and sent on. It sits
 * outside the designs' token scope and wears the brand's default dark band,
 * so it looks the same over all three and never reads as part of one.
 *
 * `sticky`, not `fixed`: pinned to the bottom of the screen while scrolling,
 * it settles below the footer at the end of the page instead of covering it.
 */
export function DesignVariantSwitcher({ current, variants, param }: DesignVariantSwitcherProps) {
  return (
    <nav
      aria-label="დიზაინის ვარიანტები"
      data-surface="inverse"
      data-testid="design-variant-switcher"
      className="border-line-strong sticky bottom-0 z-10 border-t"
    >
      <div className="max-w-page px-gutter mx-auto flex items-center justify-between gap-4 py-2.5">
        <div className="flex min-w-0 flex-col">
          <p className="text-body-sm font-semibold">დიზაინის შედარება</p>
          <p className="text-caption text-ink-muted">დროებითი ზოლი, საიტზე არ გამოჩნდება</p>
        </div>

        <ul className="flex shrink-0 items-center gap-2">
          {variants.map((variant) => {
            const active = variant.id === current;
            return (
              <li key={variant.id}>
                <a
                  href={`?${param}=${variant.id}`}
                  aria-label={`ვარიანტი ${variant.label}`}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'text-body-lg inline-flex size-11 items-center justify-center rounded-md border font-semibold transition-colors',
                    active
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-line-input text-ink hover:bg-surface-muted',
                  )}
                >
                  {variant.label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
