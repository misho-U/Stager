type Side = 'left' | 'right';

type StageDecorProps = {
  /** Where a pool of light sits behind the section, if any. */
  light?: Side;
  /** Where the stage floor (a faint grid of points) is brightest, if any. */
  floor?: Side;
};

/**
 * What a section stands on: a pool of light, the stage floor, or both,
 * behind its content (site.css, `.ct-decor`), so a page of text is not flat
 * night. The section must be `relative isolate`. Decoration only: hidden
 * from assistive technology, never in the way of a click, and still where
 * it is under reduced motion; with motion it drifts as the page scrolls
 * (`[data-drift]`, widgets/site-motion).
 */
export function StageDecor({ light, floor }: StageDecorProps) {
  if (!light && !floor) return null;
  return (
    <div aria-hidden data-decorative className="ct-decor">
      {light ? <div data-drift className={`ct-pool ct-at-${light}`} /> : null}
      {floor ? <div data-drift className={`ct-floor ct-at-${floor}`} /> : null}
    </div>
  );
}

/**
 * A section's number, with an accent rule that draws itself beside it
 * (`[data-rule]`, widgets/site-motion). Hidden from assistive technology:
 * the heading under it says what the section is; the number only paces the
 * page.
 */
export function SectionIndex({ index }: { index: number }) {
  return (
    <p aria-hidden data-decorative className="ct-index">
      <span>{String(index).padStart(2, '0')}</span>
      <span data-rule className="ct-index-rule" />
    </p>
  );
}
