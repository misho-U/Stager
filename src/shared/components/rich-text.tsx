import { cn } from '@/shared/lib/cn';

/**
 * Renders rich text from the CMS.
 *
 * The HTML is injected as-is because it was sanitised when it was saved
 * (pkg/security/sanitize.ts, on every admin write): the database only ever
 * holds the allowlisted tags. Never pass anything here that did not come
 * through that path. Typography comes from `.rich-text` in brandbook.css.
 */
export function RichText({ html, className }: { html: string; className?: string }) {
  return <div className={cn('rich-text', className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
