import 'server-only';

import DOMPurify from 'isomorphic-dompurify';

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

const ALLOWED_ATTR = ['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height', 'loading'];

/**
 * Sanitize rich text ON WRITE, in the route handler, before it reaches the
 * database.
 *
 * Sanitizing on read instead would mean the database holds hostile markup that
 * any future consumer — a feed, an export, a second frontend — would have to
 * remember to clean. Storing only safe HTML makes that impossible to forget.
 */
export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Block javascript:, data: and friends in href/src.
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    // Force links opened in a new tab to drop the opener reference.
    ADD_ATTR: ['target'],
  });
}

/** Strips every tag. For plain-text fields that must never render markup. */
export function sanitizePlainText(value: string): string {
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}
