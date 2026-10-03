/**
 * Small helpers for rendering CMS content. Structural types only, so any
 * entity's shape fits without this layer importing the entity layer.
 */

/** The section with this key, if the page has one. */
export function findSection<T extends { key: string }>(
  sections: readonly T[] | undefined,
  key: string,
): T | undefined {
  return sections?.find((section) => section.key === key);
}

/**
 * True when stored rich text has no visible words — an empty editor saves
 * markup such as "<p></p>", which must not render as an empty paragraph.
 */
export function isBlankHtml(html: string | null | undefined): boolean {
  if (!html) return true;
  return (
    html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim() === ''
  );
}

/**
 * How many characters of text stored rich text shows, roughly: tags dropped,
 * entities counted as one character. For choosing a layout by length (a
 * one-sentence intro set as a statement, a long one as reading text), never
 * for display.
 */
export function plainTextLength(html: string | null | undefined): number {
  if (!html) return 0;
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, '_')
    .replace(/\s+/g, ' ')
    .trim().length;
}

/**
 * Joins the non-empty parts of a metadata line. The separator is a comma, not a
 * middle dot: one line of project metadata reads as a phrase ("Client name,
 * Tbilisi, 2025"), and dots between every part are a template tell.
 */
export function joinMeta(parts: ReadonlyArray<string | number | null | undefined>): string {
  return parts
    .filter((part) => part !== null && part !== undefined && String(part).trim() !== '')
    .join(', ');
}
