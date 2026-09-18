import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./pkg/i18n/request.ts');

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
    remotePatterns: [
      // Vercel Blob — the only place our own images are served from.
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      // YouTube poster frames for video facades.
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
    ],
  },

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
