/**
 * Design ა "Carte": the pace of the page. Slow service: nothing moves quickly
 * and nothing bounces. Seconds, as GSAP takes them.
 */
export const CARTE_MOTION = {
  /** Lenis: how much of the remaining distance each frame covers. Low = a long glide. */
  scrollLerp: 0.07,
  /** The border round the first screen drawing out from the middle of each side. */
  frame: { duration: 1.5, ease: 'power2.inOut', innerDelay: 0.2 },
  /** The headline settling into the paper, line after line. */
  ink: { duration: 1.6, ease: 'power3.out', lineStep: 0.14, blur: 12, spread: '0.05em' },
  /** Subheading, call to action and header after the headline. */
  follow: { duration: 1.1, ease: 'power3.out', step: 0.12, delay: 0.7 },
  /** A course arriving as it scrolls into view. */
  course: { duration: 1.2, ease: 'power3.out', step: 0.08, rise: 24, blur: 6, start: 'top 88%' },
  /** A hairline or a wine-list leader being drawn. */
  rule: { duration: 1.3, ease: 'power2.inOut', start: 'top 90%' },
} as const;
