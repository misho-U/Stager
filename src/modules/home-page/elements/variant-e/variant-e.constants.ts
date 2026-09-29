/**
 * Design ე "Stages": the colour story and the pace of the film.
 */

/**
 * The page's colour matures across five stages, from an idea (cream-light)
 * to a running kitchen (deep teal). A service takes the stage nearest its
 * place in the list, so any number of services spans the whole story.
 */
export const STAGE_COLOURS = [
  { background: 'var(--stage-1)', tone: 'light' },
  { background: 'var(--stage-2)', tone: 'light' },
  { background: 'var(--stage-3)', tone: 'light' },
  { background: 'var(--stage-4)', tone: 'dark' },
  { background: 'var(--stage-5)', tone: 'dark' },
] as const;

export function stageColour(index: number, count: number) {
  const position = count <= 1 ? 0 : Math.round((index * (STAGE_COLOURS.length - 1)) / (count - 1));
  return STAGE_COLOURS[position] ?? STAGE_COLOURS[0];
}

/** The filmstrip runs sideways only with at least this many projects. */
export const FILM_MIN_FRAMES = 3;

/** The intro's id for the once-per-visit record (widgets/intro-gate). */
export const STAGES_INTRO_ID = 'stages';

/** The pace of the film. Seconds, as GSAP takes them. */
export const STAGES_MOTION = {
  scrollLerp: 0.085,
  /** The curtain: letters rising while they gain weight, a line drawn, the lift. */
  curtain: { letters: 0.9, letterStep: 0.06, line: 0.7, lift: 1.1, liftEase: 'expo.inOut' },
  /** The headline assembling from scattered letters. */
  assemble: { duration: 1.3, ease: 'expo.out', step: 0.025, spread: 160 },
  /** Scroll per stage, as a share of the screen height. */
  stageStep: 1,
  /** A stage title's letters arriving and leaving. */
  letters: { duration: 0.8, ease: 'power4.out', step: 0.02 },
  /** How far a filmstrip frame skews at speed, and the most it ever does. */
  skew: { divisor: 400, max: 6 },
} as const;
