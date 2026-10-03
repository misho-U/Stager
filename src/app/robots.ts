import type { MetadataRoute } from 'next';

import { serverEnv } from '@pkg/config/env.server';
import { toCanonicalUrl } from '@pkg/http/site-url';

/**
 * Only the production deployment is for search engines. A preview or a dev
 * server shows the same content at another address, and an indexed one would
 * compete with the real site (Vercel also marks previews noindex; this tells
 * every crawler).
 *
 * The dashboard and the API are never for search engines: the dashboard is
 * behind its login anyway, and this keeps crawlers from knocking.
 */
export default function robots(): MetadataRoute.Robots {
  if (serverEnv.VERCEL_ENV !== 'production') {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] },
    sitemap: toCanonicalUrl('/sitemap.xml'),
  };
}
