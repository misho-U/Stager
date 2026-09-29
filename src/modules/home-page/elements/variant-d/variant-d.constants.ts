/**
 * Design დ "Pass": the board's tilts and the pace of the rail.
 */

/** How the project tickets hang on the board, turn by turn. */
export const BOARD_TILTS = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2'] as const;

/** The intro's id for the once-per-visit record (widgets/intro-gate). */
export const PASS_INTRO_ID = 'pass';

/** The pace of the pass. Seconds, as GSAP takes them. */
export const PASS_MOTION = {
  scrollLerp: 0.1,
  /** The first ticket printing out of the rail: how long, and in how many feeds. */
  print: { duration: 1.9, feeds: 9 },
  /** A ticket settling on its clip after being torn off or pushed. */
  settle: { duration: 1.6, ease: 'elastic.out(1, 0.28)' },
  /** How far a ticket swings for a given speed, and the most it ever swings. */
  swing: { divisor: 90, max: 9 },
  /** The same for the page scroll, gentler: air moving through the kitchen. */
  sway: { divisor: 260, max: 4 },
  /** The ticker's pace at rest (seconds per loop) and how much scrolling speeds it. */
  ticker: { loop: 38, boostDivisor: 300, boostMax: 6 },
} as const;
