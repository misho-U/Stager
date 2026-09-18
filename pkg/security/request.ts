import 'server-only';

import { createHash } from 'node:crypto';

import { serverEnv } from '@pkg/config/env.server';
import { SITE_ORIGIN } from '@pkg/config/env.client';
import { VERCEL_URL } from '@pkg/config/runtime';

/**
 * Salted hash of the client IP.
 *
 * We need to throttle abuse per-address but have no reason to retain the
 * address itself. Hashing with a secret salt keeps rate limiting and spam
 * forensics working while making the stored value useless to anyone who reads
 * the database — an unsalted hash of an IPv4 address is trivially reversible by
 * brute force, which is why IP_HASH_SALT is required to be long.
 */
export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash('sha256').update(`${serverEnv.IP_HASH_SALT}:${ip}`).digest('hex');
}

/** Best-effort client IP from the proxy headers Vercel sets. */
export function getClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Left-most entry is the original client; the rest are proxies.
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip');
}

/** Truncated user agent — enough to spot a bot, short enough to stay cheap. */
export function getUserAgent(request: Request): string | null {
  return request.headers.get('user-agent')?.slice(0, 500) ?? null;
}

function allowedOrigins(): string[] {
  const origins = [SITE_ORIGIN];
  if (VERCEL_URL) origins.push(`https://${VERCEL_URL}`);
  return origins;
}

/**
 * Reject cross-site mutations.
 *
 * SameSite=Lax cookies already stop a cross-site form POST from carrying the
 * session, but that is one control from one source. This is a second, explicit
 * check that does not depend on browser cookie policy staying as it is.
 *
 * `Sec-Fetch-Site` is sent by every current browser and is the stronger signal;
 * `Origin` is the fallback for clients that omit it.
 */
export function isSameOriginRequest(request: Request): boolean {
  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite) {
    return secFetchSite === 'same-origin' || secFetchSite === 'none';
  }

  const origin = request.headers.get('origin');
  if (origin) return allowedOrigins().includes(origin);

  // No Origin and no Sec-Fetch-Site: not a browser form post. Server-to-server
  // callers (our own server components) are same-origin by construction.
  return true;
}
