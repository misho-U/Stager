/**
 * The site's design, "Chef's Table": the timings and eases of its motion, in
 * one place. Calm by request (motion 5): things arrive and the page draws as
 * it is read, nothing performs for its own sake. Everything it shows can be
 * reached with reduced motion, where none of this runs.
 */
export const CT_MOTION = {
  /** Lenis: a slow, even glide. */
  lerp: 0.1,
  /** The hero's headline: its lines rising into place on arrival. */
  assemble: { duration: 1, ease: 'expo.out', stagger: 0.08, delay: 0.15 },
  /** The rest of the hero, after the headline. */
  enter: { duration: 0.9, ease: 'power3.out', stagger: 0.1, delay: 0.6 },
  /** The hero's light following the pointer. */
  light: { duration: 1.4, ease: 'power3.out' },
  /** The company's figures counting up to their numbers. */
  count: { duration: 1.6, ease: 'power2.out', delay: 0.2 },
  /** The intro read along: how faint the words start. */
  readAlong: { from: 0.16 },
  /**
   * The services' journey: where on the screen its line starts and finishes
   * filling (ScrollTrigger start/end, the journey's edges against the screen).
   */
  journey: { start: 'top 70%', end: 'bottom 60%' },
  /** Sections and cards rising into view, once. */
  reveal: { y: 36, duration: 0.9, ease: 'power3.out', stagger: 0.08 },
  /** The Academy's filter. */
  flip: { duration: 0.55, ease: 'power3.inOut' },
  /** The video player opening out of the card that was pressed. */
  player: { duration: 0.75, ease: 'expo.inOut' },
  /** The menu's links rising in. */
  menu: { duration: 0.8, ease: 'expo.out', stagger: 0.06 },
} as const;
