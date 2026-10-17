/**
 * Turns HTML pasted into a plain-text field back into the text it shows.
 *
 * A bio, a summary, an excerpt is a plain text box: what is typed is what the
 * site shows, line breaks and all. Text copied from a rich editor or another
 * site can carry its markup along, and the site then showed "<p>" and
 * "<br />" in the middle of a team member's bio. A break or the end of a
 * paragraph becomes a new line, every other tag is dropped, and the common
 * entities become their characters. Text with no tag in it is returned as it
 * is, so a "<" or ">" written in a sentence is never touched.
 */
const TAG = /<\/?[a-z][a-z0-9]*\b[^<>]*>/i;

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
};

export function htmlToPlainText(value: string): string {
  if (!TAG.test(value)) return value;
  return (
    value
      // A break, or one block ending and the next starting, is a new line.
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|blockquote)>\s*/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '• ')
      .replace(/<\/?[a-z][a-z0-9]*\b[^<>]*>/gi, '')
      .replace(
        /&(nbsp|amp|lt|gt|quot|apos|#39);/gi,
        (entity) => ENTITIES[entity.toLowerCase()] ?? entity,
      )
      // No run of blank lines longer than one, nor stray spaces at line ends.
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
  );
}
