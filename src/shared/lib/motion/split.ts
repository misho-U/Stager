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

/** What a keyboard can reach. Text holding one of these is never split. */
const INTERACTIVE = 'a[href], button, input, select, textarea, summary, [tabindex]';

/**
 * Splits CMS text for an entrance and keeps it correct.
 *
 * - A screen reader hears the text once, never letter by letter: the pieces
 *   are hidden from it. A heading carries its text as its accessible name
 *   (`aria: 'auto'`); anything else may not (on a plain div or paragraph the
 *   label is ignored, and the intro paragraph was announced as nothing), so
 *   it gets a visually hidden copy of its markup instead (`hideFragments`).
 * - Text holding a link (rich text may) is left whole and unanimated: split,
 *   the link's words would be hidden from a screen reader while Tab still
 *   reaches it, a link with no name.
 * - `autoSplit` re-splits when the width or the font changes, since line
 *   breaks computed in a fallback font would otherwise be kept forever.
 * - Georgian has no case and no italic, and SplitText changes neither: the
 *   pieces keep the element's own typography.
 */
export function splitReveal(
  target: Element,
  { type, mask, animate }: SplitRevealOptions,
): SplitText | null {
  if (target.querySelector(INTERACTIVE)) return null;
  const heading = /^H[1-6]$/.test(target.tagName);
  // The element before splitting, for the copy a screen reader reads.
  const original = heading ? null : target.cloneNode(true);
  let copy: Element | null = null;
  return SplitText.create(target, {
    type,
    mask,
    aria: heading ? 'auto' : 'none',
    autoSplit: true,
    onSplit: (split: SplitText) => {
      if (original instanceof Element) copy = readableCopy(target, original);
      loosenMasks(split);
      return animate(split);
    },
    // Before every re-split, and when the motion is torn down.
    onRevert: () => {
      copy?.remove();
      copy = null;
      if (original) target.removeAttribute('aria-hidden');
    },
  });
}

/**
 * Hides split text from screen readers and puts it back just before it, as a
 * visually hidden copy of the element as it was, so its paragraphs and
 * emphasis read as before. The copy carries no id (they must stay unique), no
 * data attribute (the motion selects by them, and so do tests) and no inline
 * style (an entrance's starting state, set before the split).
 */
function readableCopy(target: Element, original: Element): Element {
  const copy = original.cloneNode(true) as Element;
  for (const element of [copy, ...copy.querySelectorAll('*')]) {
    for (const { name } of [...element.attributes]) {
      if (name === 'id' || name === 'style' || name.startsWith('data-')) {
        element.removeAttribute(name);
      }
    }
  }
  copy.setAttribute('class', 'sr-only');
  target.setAttribute('aria-hidden', 'true');
  target.before(copy);
  return copy;
}
