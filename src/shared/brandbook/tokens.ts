import { BRAND_HEX } from '@pkg/brand/hex.generated';

/**
 * Brand values for the few places no stylesheet reaches: the theme-color meta
 * tag, generated OG images, transactional email.
 *
 * The hexes are NOT defined here. They are generated from
 * src/shared/brandbook/brandbook.css — the one file every visual value lives
 * in — by scripts/brand-tokens.ts, on install, dev and build. Change a colour
 * there, never here. Anything rendered in a browser should use the Tailwind
 * utilities (`bg-surface`, `text-ink-subtle`) or `var(--color-…)` instead.
 */
export { BRAND_HEX };

export type BrandColor = keyof typeof BRAND_HEX;

/** Colour of the browser chrome on mobile. */
export const THEME_COLOR = BRAND_HEX.teal;

/**
 * CSS custom property references, for the rare component that must compute a
 * style inline (a dynamic grid template, an SVG fill bound to a prop).
 * Prefer a Tailwind utility class wherever one exists.
 */
export const CSS_VAR = {
  colorInk: 'var(--color-ink)',
  colorInkMuted: 'var(--color-ink-muted)',
  colorInkSubtle: 'var(--color-ink-subtle)',
  colorSurface: 'var(--color-surface)',
  colorSurfaceRaised: 'var(--color-surface-raised)',
  colorSurfaceInverse: 'var(--color-surface-inverse)',
  colorLine: 'var(--color-line)',
  fontSans: 'var(--font-sans)',
  fontDisplay: 'var(--font-display)',
  easeBrand: 'var(--ease-brand)',
} as const;

/** Brand metadata used in SEO defaults. */
export const BRAND = {
  name: 'STAGER',
  tagline: 'Building Better Food Businesses',
  positioning: 'Culinary & Foodservice Development',
} as const;
