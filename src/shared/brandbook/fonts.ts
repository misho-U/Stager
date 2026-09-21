import localFont from 'next/font/local';

/**
 * Noto Sans Georgian, self-hosted.
 *
 * One family for both alphabets. The site is Georgian-first with an English
 * counterpart, and a Latin-only display face would make English headlines look
 * like a different brand. Noto Sans Georgian covers both scripts with matching
 * proportions, so the locale switch changes the words and nothing else.
 *
 * WHY LOCAL RATHER THAN next/font/google:
 * `next/font/google` downloads the font at BUILD time. On a machine that cannot
 * reach fonts.googleapis.com — behind a proxy, on a restricted network, or
 * simply offline — it falls back to a system font with only a warning, so the
 * build silently succeeds and the site renders in the wrong typeface. Georgian
 * text suffers worst, since the system fallback is whatever the OS happens to
 * have. Shipping the files makes every build produce identical output.
 *
 * The files are the same woff2s Google serves: variable (weight 100–900, so one
 * file covers every weight) and split by script. Licensed under the SIL Open
 * Font License 1.1 — see fonts/OFL.txt, which permits redistribution.
 *
 * Each subset is a separate @font-face with its own `unicode-range`, exactly as
 * Google does it. The browser then downloads only the scripts a page actually
 * uses: an English page never fetches the 41 KB Georgian file. Because they are
 * separate families, all three are chained in `--font-sans` (see globals.css)
 * and the browser resolves per character.
 *
 * Every option below is written out literally on purpose — next/font analyses
 * these calls statically at build time, so a shared spread object is rejected.
 *
 * ON `preload`: measured against a production build on Next 16, no
 * `<link rel="preload" as="font">` is emitted for these, with or without the
 * unicode-range declarations. The flags below record the intent and will take
 * effect if that changes; do not assume a preload is happening today. It costs
 * little here — the faces are declared in a render-blocking stylesheet the
 * browser already has, and `display: swap` keeps text visible throughout.
 */

/** Georgian — the primary locale. */
export const notoGeorgian = localFont({
  src: './fonts/noto-sans-georgian-georgian.woff2',
  variable: '--font-noto-georgian',
  weight: '100 900',
  style: 'normal',
  // Readable immediately in the fallback, restyled on arrival. For a content
  // site that beats invisible text.
  display: 'swap',
  preload: true,
  fallback: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
  declarations: [
    {
      prop: 'unicode-range',
      value: 'U+0589, U+10A0-10FF, U+1C90-1CBA, U+1CBD-1CBF, U+205A, U+2D00-2D2F, U+2E31',
    },
  ],
});

/** Basic Latin. Used on every page — the wordmark alone needs it. */
export const notoLatin = localFont({
  src: './fonts/noto-sans-georgian-latin.woff2',
  variable: '--font-noto-latin',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  preload: true,
  fallback: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
    },
  ],
});

/**
 * Extended Latin — accented characters in client names, currency symbols.
 * Most pages never touch it, and its unicode-range means the browser only
 * fetches it when one of these characters actually appears.
 */
export const notoLatinExt = localFont({
  src: './fonts/noto-sans-georgian-latin-ext.woff2',
  variable: '--font-noto-latin-ext',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  preload: false,
  fallback: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF',
    },
  ],
});

/**
 * Applied to <html> so all three variables are in scope for the document.
 * globals.css chains them in `--font-sans`.
 */
export const fontVariables = [
  notoGeorgian.variable,
  notoLatin.variable,
  notoLatinExt.variable,
].join(' ');
