/**
 * Option 1, "Open Kitchen": the timings and eases of its motion, in one
 * place. Calm by design (motion 5): things arrive and respond, nothing
 * performs.
 */
export const OK_MOTION = {
  /** Lenis: how quickly the page catches up with the wheel (higher is snappier). */
  lerp: 0.1,
  /** In-page links land this far below the top, clear of the floating header. */
  anchorOffset: 96,
  /** The hero's headline and the elements under it. */
  enter: { duration: 1, ease: 'expo.out', stagger: 0.09, delay: 0.1 },
  /** Sections and cards as they scroll into view. */
  reveal: { y: 28, duration: 0.8, ease: 'power3.out', stagger: 0.08 },
  /** The live board in the hero. */
  board: {
    /** Seconds each card stays in front before the next one comes. */
    interval: 7,
    /** A swiped card leaving. */
    out: { duration: 0.45, ease: 'power2.in' },
    /** A shuffled card lifting clear of the deck. */
    lift: { duration: 0.32, ease: 'power2.out' },
    /** Cards settling into their new places. */
    settle: { duration: 0.6, ease: 'power3.inOut' },
    /** How far (px) a card must be dragged to change it. */
    swipe: 70,
    /** How far (px) each card behind the front one rises above it. */
    peek: 22,
    /** How much smaller each card behind the front one is. */
    shrink: 0.05,
  },
  /** The services explorer's panel when another service opens. */
  explorer: { duration: 0.5, ease: 'power3.out', hoverIntent: 140 },
  /** The Academy's rows re-ordering after a filter. */
  flip: { duration: 0.55, ease: 'power3.inOut' },
  /** The video player when another episode is chosen. */
  playlist: { duration: 0.4, ease: 'power2.out' },
  /** The footer's wordmark rising letter by letter. */
  footer: { stagger: 0.06 },
} as const;
