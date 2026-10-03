import 'server-only';

import sanitizeHtml from 'sanitize-html';

import { blobStoreHost } from '@pkg/blob/store';
import { sanitizeRichTextWith } from '@pkg/security/sanitize-options';

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
 *
 * The rich-text policy (tags, attributes, schemes, links, images) lives in
 * ./sanitize-options.ts, where tests can reach it; this file adds the one
 * thing only the server knows, the blob store images may come from.
 */

/**
 * Sanitize rich text ON WRITE, in the route handler, before it reaches the
 * database.
 *
 * Sanitizing on read instead would mean the database holds hostile markup that
 * any future consumer — a feed, an export, a second frontend — would have to
 * remember to clean. Storing only safe HTML makes that impossible to forget.
 */
export function sanitizeRichText(html: string): string {
  const store = blobStoreHost();
  return sanitizeRichTextWith(html, { imageHosts: store ? [store] : [] });
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
