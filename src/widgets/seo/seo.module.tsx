import type { JsonLdNode } from '@/widgets/seo/seo.utils';

/**
 * A page's structured data, for search engines and AI crawlers: a data
 * block the browser never runs (so no CSP nonce). The JSON comes from the
 * dashboard, so `<` is escaped: no value can close the tag early.
 */
export function JsonLd({ data }: { data: JsonLdNode }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
