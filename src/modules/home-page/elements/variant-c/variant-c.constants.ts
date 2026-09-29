/**
 * Design გ "Plate": sizes that repeat round the table, and the pace.
 */

/** Project plates are set in three sizes, in this order round the table. */
export const PLATE_SIZES = ['w-(--plate-lg)', 'w-(--plate-md)', 'w-(--plate-sm)'] as const;

/** How many plates fan out over the intro. */
export const FAN_PLATES = 3;

/** The pace of the table. Seconds, as GSAP takes them. */
export const PLATE_MOTION = {
  scrollLerp: 0.1,
  /** The big plate rolling in on its rim and settling. */
  roll: { duration: 1.6, ease: 'power3.out', turns: 0.5 },
  /** The headline's words rising with a slight turn, as if set down. */
  words: { duration: 1, ease: 'power4.out', step: 0.07, turn: 7 },
  /** One slow turn of the text ring, in seconds, at rest. */
  ringTurn: 22,
  /** How much a fast scroll spins the ring up. */
  ringBoost: { divisor: 350, max: 8 },
  /** Scroll per service on the lazy Susan, as a share of the screen height. */
  susanStep: 0.7,
  /** Lazy Susan detents: how it settles onto the nearest dish. */
  susanSnap: { duration: 0.45, ease: 'power2.inOut' },
  /** How strongly a round button leans toward the pointer. */
  magnet: 0.3,
} as const;
