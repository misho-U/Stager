/** Where a skip link lands: the page's own `<main>`. */
export const CONTENT_ID = 'content';

/**
 * The first thing Tab reaches on a page: a jump past the header and the
 * navigation, straight to the content, so a keyboard does not walk through
 * every menu link on every page. Out of sight until it has focus
 * (`sr-only-focusable`, globals.css).
 *
 * The target is `<main id={CONTENT_ID} tabIndex={-1}>`: focusable by the jump,
 * so the next Tab continues from the content, but not a stop of its own.
 */
export function SkipLink({ label }: { label: string }) {
  return (
    <a
      href={`#${CONTENT_ID}`}
      className="sr-only-focusable bg-surface-raised text-ink text-body-sm shadow-card fixed top-3 left-3 z-(--z-overlay) rounded-md px-4 py-2 font-medium"
    >
      {label}
    </a>
  );
}
