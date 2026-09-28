/**
 * TEMPORARY — the five home page designs under comparison (round 3), chosen
 * with `?v=a…e` (a link opens a specific one). Removed once one is chosen.
 *
 * The labels are the Georgian letters ა ბ გ დ ე: the switcher is for the
 * client, who reads Georgian. Ordered from the calmest design to the most
 * cinematic.
 */
export const HOME_VARIANTS = [
  { id: 'a', label: 'ა' },
  { id: 'b', label: 'ბ' },
  { id: 'c', label: 'გ' },
  { id: 'd', label: 'დ' },
  { id: 'e', label: 'ე' },
] as const;

export type HomeVariant = (typeof HOME_VARIANTS)[number]['id'];

export const DEFAULT_HOME_VARIANT: HomeVariant = 'a';

/** The query parameter a shared link uses to open a specific design. */
export const HOME_VARIANT_PARAM = 'v';
