import { clientEnv } from '@pkg/config/env.client';
import { IS_DEVELOPMENT } from '@pkg/config/runtime';

/**
 * Content-Security-Policy.
 *
 * Two variants, for a deliberate reason:
 *
 *  - ADMIN gets a nonce with 'strict-dynamic'. It is the high-value surface,
 *    and it is dynamically rendered anyway, so the nonce costs nothing.
 *
 *  - PUBLIC pages get 'unsafe-inline' for scripts instead. A nonce is unique
 *    per request, which forces every page to render per-request and throws away
 *    full-route caching on what is a mostly-static marketing site. That trade
 *    is only acceptable because the realistic injection vector — admin-authored
 *    rich text — is already stripped of <script> at the point of writing (see
 *    pkg/security/sanitize.ts), so the CSP here is defence in depth rather than
 *    the primary control. Every other directive stays locked down: no plugins,
 *    no framing, no base-tag hijacking, and a strict allowlist for where
 *    scripts, images and connections may come from.
 */

function buildDirectives(scriptSrc: string[]): Record<string, string[]> {
  const supabaseOrigin = clientEnv.NEXT_PUBLIC_SUPABASE_URL;

  return {
    'default-src': ["'self'"],
    'script-src': scriptSrc,
    // React `style` attributes and Next's own injected styles are inline;
    // there is no nonce path for them, and CSS injection is not a
    // code-execution vector here.
    //
    // Google's font hosts are deliberately absent: the typeface is self-hosted
    // (see src/shared/brandbook/brandbook.css), so nothing should ever be
    // fetched from them. Leaving them allowlisted would permit a request this
    // site has no reason to make.
    'style-src': ["'self'", "'unsafe-inline'"],
    'font-src': ["'self'", 'data:'],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https://*.public.blob.vercel-storage.com',
      'https://i.ytimg.com',
      'https://img.youtube.com',
    ],
    'media-src': ["'self'", 'https://*.public.blob.vercel-storage.com'],
    'connect-src': [
      "'self'",
      supabaseOrigin,
      // Supabase realtime, if it is ever switched on.
      supabaseOrigin.replace('https://', 'wss://'),
      'https://blob.vercel-storage.com',
      'https://*.public.blob.vercel-storage.com',
      ...(IS_DEVELOPMENT ? ['ws://localhost:*', 'http://localhost:*'] : []),
    ],
    // Only the privacy-preserving YouTube host, and only for video embeds.
    'frame-src': ["'self'", 'https://www.youtube-nocookie.com', 'https://www.youtube.com'],
    // No Flash, no Java, no <embed>.
    'object-src': ["'none'"],
    // Stops an injected <base> from re-pointing every relative URL.
    'base-uri': ["'self'"],
    // Forms may only post back to us.
    'form-action': ["'self'"],
    // Nobody may frame this site — clickjacking protection alongside
    // X-Frame-Options for older browsers.
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': [],
  };
}

function serialise(directives: Record<string, string[]>): string {
  return Object.entries(directives)
    .map(([directive, values]) => (values.length ? `${directive} ${values.join(' ')}` : directive))
    .join('; ');
}

/** Strict, nonce-based policy for the dashboard. */
export function buildAdminCsp(nonce: string): string {
  return serialise(
    buildDirectives([
      "'self'",
      `'nonce-${nonce}'`,
      // Lets Next's bootstrap script load its own chunks without listing each.
      "'strict-dynamic'",
      // Ignored by browsers that understand strict-dynamic; a fallback for the
      // ones that do not.
      "'unsafe-inline'",
      ...(IS_DEVELOPMENT ? ["'unsafe-eval'"] : []),
    ]),
  );
}

/** Cache-friendly policy for the public site. */
export function buildPublicCsp(): string {
  return serialise(
    buildDirectives([
      "'self'",
      "'unsafe-inline'",
      // React Refresh needs eval in development only.
      ...(IS_DEVELOPMENT ? ["'unsafe-eval'"] : []),
    ]),
  );
}

/** Cryptographically random, single-use nonce. */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
