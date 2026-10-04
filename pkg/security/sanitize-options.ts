import sanitizeHtml from 'sanitize-html';

/**
 * The rich-text policy itself, without the `server-only` guard of
 * pkg/security/sanitize.ts, so tests can check it directly. Application code
 * calls `sanitizeRichText()` from there, which supplies the image hosts.
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

export type RichTextPolicy = {
  /**
   * Hosts an <img> may load from: the site's own blob store. Anything else is
   * dropped, because the CSP would block it on the page anyway (a broken
   * image) and an outside image is a tracking pixel the admin never meant.
   */
  imageHosts: readonly string[];
};

function imageAllowed(src: string | undefined, hosts: readonly string[]): boolean {
  if (!src) return false;
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && hosts.includes(url.hostname);
  } catch {
    return false;
  }
}

export function sanitizeRichTextWith(html: string, policy: RichTextPolicy): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    // javascript:, vbscript:, data: and every other scheme are refused in
    // href/src. Relative links (/contact, #section) are unaffected.
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    transformTags: {
      // A link that opens a new tab can otherwise reach back through
      // window.opener and redirect the page that opened it. Only `_blank` is
      // kept, always with noopener; any other target or rel is dropped, so
      // `rel="opener"` or a named window cannot restore that access.
      a: (tagName, attribs) => {
        const { target, rel: _rel, ...rest } = attribs;
        return target?.toLowerCase() === '_blank'
          ? { tagName, attribs: { ...rest, target: '_blank', rel: 'noopener noreferrer' } }
          : { tagName, attribs: rest };
      },
    },
    exclusiveFilter: (frame) =>
      frame.tag === 'img' && !imageAllowed(frame.attribs.src, policy.imageHosts),
  });
}
