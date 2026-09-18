import { Noto_Sans_Georgian } from 'next/font/google';

/**
 * One family for both alphabets.
 *
 * The site is Georgian-first with an English counterpart, and a Latin-only
 * display face would make English headlines look like a different brand. Noto
 * Sans Georgian covers both scripts with matching proportions, so the locale
 * switch changes the words and nothing else.
 *
 * Exposed as a CSS variable so globals.css owns the actual font-family
 * declaration — see `--font-sans` in the @theme block.
 */
export const notoSansGeorgian = Noto_Sans_Georgian({
  subsets: ['georgian', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-georgian',
  display: 'swap',
  preload: true,
});

/** Applied on <html> so the variable is in scope for the whole document. */
export const fontVariables = notoSansGeorgian.variable;
