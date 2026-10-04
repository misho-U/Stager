import { withSentryConfig } from '@sentry/nextjs/config';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

import { storeHostFromToken } from './pkg/blob/store-host';

const withNextIntl = createNextIntlPlugin('./pkg/i18n/request.ts');

/**
 * This project's own blob store: the only images the optimizer will fetch.
 * With the old `*.public.blob.vercel-storage.com`, anyone could have pointed
 * /_next/image at their own store and spent this plan's image quota.
 */
const blobStoreHost = storeHostFromToken(process.env.BLOB_READ_WRITE_TOKEN);

/**
 * Static security headers.
 *
 * Content-Security-Policy is deliberately NOT here — it carries a per-request
 * nonce and is set in middleware.ts. Everything below is request-independent.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Fail the production build on type errors instead of shipping them.
  // (Next 16 dropped the built-in `eslint` config key — linting runs as its own
  // step, `pnpm lint`, and in CI.)
  typescript: { ignoreBuildErrors: false },

  // Do not advertise the framework version.
  poweredByHeader: false,

  images: {
    // Modern formats first; next/image negotiates per browser.
    formats: ['image/avif', 'image/webp'],
    // An upload never changes once stored (each gets a random suffix), so a
    // resized copy can be kept for a month instead of being remade every four
    // hours against the quota. A deleted image's resized copies can live that
    // long too: purge the image cache in Vercel if one must vanish sooner.
    minimumCacheTTL: 2_678_400,
    // Uploads only, under media/. YouTube posters are not optimized: any video
    // id would do, so they load straight from YouTube (VideoPoster).
    remotePatterns: blobStoreHost
      ? [{ protocol: 'https', hostname: blobStoreHost, pathname: '/media/**' }]
      : [],
  },

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

/**
 * Sentry, only when its DSN is set (pkg/monitoring): without one the build is
 * exactly what it was. Browser events go through /monitoring on this site,
 * which ad blockers leave alone (the proxy skips that path). Source maps are
 * uploaded only when SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT are set;
 * without them stack traces read minified, and the build still succeeds.
 */
export default process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()
  ? withSentryConfig(withNextIntl(nextConfig), {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      tunnelRoute: '/monitoring',
      silent: !process.env.CI,
      telemetry: false,
      // No performance tracing (pkg/monitoring/options.ts), so no router spans.
      suppressOnRouterTransitionStartWarning: true,
    })
  : withNextIntl(nextConfig);
