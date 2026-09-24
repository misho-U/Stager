import 'server-only';

import sanitizeHtml from 'sanitize-html';

/**
 * WHY sanitize-html AND NOT DOMPurify:
 * DOMPurify needs a DOM, and on the server that meant isomorphic-dompurify →
 * jsdom: ~685 files loaded at import. jsdom crashes when imported inside a
 * Vercel function, which took down EVERY route that sanitises — public page
 * reads and admin saves alike — while the same build passed locally, even as a
 * standalone build. sanitize-html parses with htmlparser2 and needs no DOM, so
 * there is nothing environment-specific to break.
 *
 * Do not reintroduce a jsdom-based sanitizer.
 */

/**
 * Tags an admin may use in rich-text fields. Deliberately small: this is
 * editorial copy, not arbitrary markup. No <script>, no <style>, no <iframe>
 * (YouTube gets its own dedicated field and renders through a facade
 * component), no event handlers.
 */
const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'blockquote',
  'ul',
  'ol',
  'li',
  'h2',
  'h3',
  'h4',
  'a',
  'figure',
  'figcaption',
  'img',
  'hr',
  'code',
  'pre',
];

/**
 * Attributes, scoped to the tag that needs them. The previous list was global,
 * which also permitted `href` on a <p> or `src` on a <strong> — harmless after
 * scheme filtering, but nothing needs them, so nothing gets them.
 */
const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
};

const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: ALLOWED_ATTRIBUTES,
  // javascript:, vbscript:, data: and every other scheme are refused in
  // href/src. Relative links (/contact, #section) are unaffected.
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  transformTags: {
    // A link that opens a new tab can otherwise reach back through
    // window.opener and redirect the page that opened it. The previous
    // implementation claimed to prevent this but only permitted the `target`
    // attribute; this actually enforces it.
    a: (tagName, attribs) =>
      attribs.target === '_blank'
        ? { tagName, attribs: { ...attribs, rel: 'noopener noreferrer' } }
        : { tagName, attribs },
  },
};

/**
 * Sanitize rich text ON WRITE, in the route handler, before it reaches the
 * database.
 *
 * Sanitizing on read instead would mean the database holds hostile markup that
 * any future consumer — a feed, an export, a second frontend — would have to
 * remember to clean. Storing only safe HTML makes that impossible to forget.
 */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, RICH_TEXT_OPTIONS);
}

/** The only three characters sanitize-html escapes in text output. */
const TEXT_ENTITIES = { amp: '&', lt: '<', gt: '>' } as const;

/**
 * Strips every tag and returns PLAIN TEXT — not HTML.
 *
 * Entities are decoded, so "Tom & Jerry" is stored as "Tom & Jerry", not
 * "Tom &amp; Jerry". Every consumer escapes on output already — React in the
 * dashboard, escapeHtml() in the email template — so pre-escaped text would be
 * escaped twice and show a literal "&amp;". (The DOMPurify version was
 * inconsistent: it returned input without a "<" untouched, but escaped input
 * with one, so "I <3 food" displayed as "I &lt;3 food".)
 *
 * Never inject this into HTML unescaped — it is text.
 *
 * The decode is a single left-to-right pass, the exact inverse of escaping
 * those three characters: "&amp;lt;" becomes "&lt;", never "<".
 */
export function sanitizePlainText(value: string): string {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
    .replace(/&(amp|lt|gt);/g, (_, entity: keyof typeof TEXT_ENTITIES) => TEXT_ENTITIES[entity])
    .trim();
}
