/**
 * Brand tokens for contexts that cannot use CSS.
 *
 * src/app/globals.css is the source of truth for anything rendered in a
 * browser — use the Tailwind utilities (`bg-brand-teal`, `text-ink-subtle`) or
 * `var(--color-…)` there. This file exists only for the handful of places where
 * no stylesheet applies: transactional email HTML, generated OG images, the web
 * manifest and theme-color meta tag.
 *
 * KEEP IN SYNC with the @theme block in globals.css.
 */
export const BRAND_HEX = {
  teal: '#1D464A',
  tealSoft: '#4D6266',
  tealMuted: '#567578',
  sage: '#8EA3A5',
  cream: '#EFEEE6',
  creamTint: '#F3F2EC',
  creamLight: '#F8F8F4',
  white: '#FFFFFF',
} as const;

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
