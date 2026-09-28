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
    onSplit: (split: SplitText) => animate(split),
  });
}
