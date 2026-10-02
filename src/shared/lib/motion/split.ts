import { SplitText, type gsap } from '@/shared/lib/motion/gsap';

/**
 * How many pieces of a split heading get a staggered start of their own. A
 * heading from the dashboard can run to 300 characters; past this point the
 * rest arrives together, so it never takes seconds to finish appearing.
 */
export const MAX_STAGGERED = 12;

/** A stagger that stops growing after `max` pieces (see MAX_STAGGERED). */
export function cappedStagger(step: number, max = MAX_STAGGERED) {
  return (index: number) => Math.min(index, max) * step;
}

/**
 * Opens a split's clipping masks a little above and below the line, without
 * moving anything. Georgian letters reach well below the baseline (and some
 * above the cap height), and at a display line-height of 1.05 a mask cut to
 * the line box clips them, during the entrance and for good after it.
 *
 * The clip is drawn past the box (a negative inset) rather than the box
 * grown with padding and pulled back with negative margins: stacked line
 * masks are blocks, their margins collapse into one another, and every line
 * after the first would sit 0.2em lower than the text it replaced.
 */
export function loosenMasks(split: SplitText): void {
  for (const mask of split.masks) {
    if (!(mask instanceof HTMLElement)) continue;
    mask.style.overflow = 'visible';
    mask.style.clipPath = 'inset(-0.2em -0.1em)';
  }
}

type SplitRevealOptions = {
  /** What to split into: 'lines', 'words', 'chars', or a combination. */
  type: string;
  /** Wrap each piece in a clipping mask, so it can rise out of nowhere. */
  mask?: 'lines' | 'words' | 'chars';
  /**
   * Builds the animation for the freshly split pieces. Called again after
   * every re-split (resize, font load), so it must return the animation it
   * creates, which is then reverted and rebuilt.
   */
  animate: (split: SplitText) => gsap.core.Animation | void;
};

/**
 * Splits CMS text for an entrance and keeps it correct.
 *
 * - `aria: 'auto'` gives the element its full text as an accessible name and
 *   hides the fragments, so a screen reader hears the heading once, not
 *   letter by letter.
 * - `autoSplit` re-splits when the width or the font changes, since line
 *   breaks computed in a fallback font would otherwise be kept forever.
 * - Georgian has no case and no italic, and SplitText changes neither: the
 *   pieces keep the element's own typography.
 */
export function splitReveal(target: Element, { type, mask, animate }: SplitRevealOptions) {
  return SplitText.create(target, {
    type,
    mask,
    aria: 'auto',
    autoSplit: true,
    onSplit: (split: SplitText) => {
      loosenMasks(split);
      return animate(split);
    },
  });
}
