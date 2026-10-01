/**
 * TEMPORARY — the two home page designs under comparison (round 4), chosen
 * with `?v=1` or `?v=2` (a link opens a specific one). Removed once one is
 * chosen.
 *
 *   1  "Open Kitchen" — light: bright, precise, every station within reach.
 *   2  "Chef's Table" — dark: cinematic, the Academy and the videos as the show.
 */
export const HOME_VARIANTS = [
  { id: '1', label: '1' },
  { id: '2', label: '2' },
] as const;

export type HomeVariant = (typeof HOME_VARIANTS)[number]['id'];

export const DEFAULT_HOME_VARIANT: HomeVariant = '1';

/** The query parameter a shared link uses to open a specific design. */
export const HOME_VARIANT_PARAM = 'v';
