/**
 * TEMPORARY — the three home page designs under comparison, chosen with
 * `?v=a|b|c` (a link opens a specific one). Removed once one is chosen.
 *
 * The labels are the Georgian letters ა ბ გ: the switcher is for the client,
 * who reads Georgian.
 */
export const HOME_VARIANTS = [
  { id: 'a', label: 'ა' },
  { id: 'b', label: 'ბ' },
  { id: 'c', label: 'გ' },
] as const;

export type HomeVariant = (typeof HOME_VARIANTS)[number]['id'];

export const DEFAULT_HOME_VARIANT: HomeVariant = 'a';

/** The query parameter a shared link uses to open a specific design. */
export const HOME_VARIANT_PARAM = 'v';
