/**
 * Option 2, "Chef's Table": the timings and eases of its motion, in one
 * place. Cinematic by design (motion 8): the page plays as you scroll, and
 * everything it shows can still be reached with reduced motion, where none
 * of this runs.
 */
export const CT_MOTION = {
  /** Lenis: a slower, heavier glide than option 1's. */
  lerp: 0.08,
  /** In-page links land this far below the top, clear of the header pill. */
  anchorOffset: 92,
  /** The hero's headline: letters rising into place on arrival. */
  assemble: { duration: 1.1, ease: 'expo.out', stagger: 0.03, delay: 0.15 },
  /** The rest of the hero, after the headline. */
  enter: { duration: 0.9, ease: 'power3.out', stagger: 0.1, delay: 0.6 },
  /** The hero's light following the pointer. */
  light: { duration: 1.4, ease: 'power3.out' },
  /**
   * The hero's screen growing to fill the view (desktop): `length` screens
   * of scroll; the rest are shares of that scroll.
   */
  screen: { length: 1, open: 0.75, copyOut: 0.45, captionAt: 0.72 },
  /** The ticker: seconds per loop at rest, how much scrolling speeds it up. */
  ticker: { duration: 42, boost: 5, settle: 1.2 },
  /** The intro read along: how faint the words start. */
  readAlong: { from: 0.16 },
  /** A service card as the next one covers it. */
  stack: { scale: 0.94, dim: 0.35 },
  /** The filmstrip: how far frames lean with speed, and how they straighten. */
  film: { skew: 5, settle: 0.6 },
  /** Sections and cards rising into view, once. */
  reveal: { y: 36, duration: 0.9, ease: 'power3.out', stagger: 0.08 },
  /** The Academy's filter. */
  flip: { duration: 0.55, ease: 'power3.inOut' },
  /** The video player opening out of the card that was pressed. */
  player: { duration: 0.75, ease: 'expo.inOut' },
  /** The menu's links rising in. */
  menu: { duration: 0.8, ease: 'expo.out', stagger: 0.06 },
} as const;
