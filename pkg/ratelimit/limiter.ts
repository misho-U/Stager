import 'server-only';

import { prisma } from '@pkg/db/prisma';
import { logger, serialiseError } from '@pkg/logger';

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

type RateLimitOptions = {
  /** Namespaced identifier, e.g. `contact:<ipHash>`. Never a raw IP or email. */
  key: string;
  limit: number;
  windowSeconds: number;
};

/**
 * Fixed-window rate limiter backed by Postgres.
 *
 * An in-memory counter is useless here: every serverless invocation gets its
 * own memory, so an attacker would simply be spread across instances. Postgres
 * is the one piece of state all instances already share, and the upsert below
 * is atomic, so concurrent requests cannot both read a stale count.
 *
 * Upstash/Redis would be faster and is a drop-in replacement for this function
 * later — it is kept out for now because it means another vendor and another
 * key to manage for what is, at this traffic level, one extra query.
 */
export async function checkRateLimit({
  key,
  limit,
  windowSeconds,
}: RateLimitOptions): Promise<RateLimitResult> {
  const windowMs = windowSeconds * 1000;
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const retryAfterSeconds = Math.ceil((windowStart.getTime() + windowMs - now) / 1000);

  try {
    const record = await prisma.rateLimit.upsert({
      where: { key_windowStart: { key, windowStart } },
      create: { key, windowStart, count: 1 },
      update: { count: { increment: 1 } },
      select: { count: true },
    });

    // Sweep expired windows on roughly 1% of calls. Cheap enough to be
    // invisible, frequent enough that the table never grows unbounded, and it
    // avoids depending on a cron job that could quietly stop running.
    if (Math.random() < 0.01) {
      void prisma.rateLimit
        .deleteMany({ where: { windowStart: { lt: new Date(now - 24 * 60 * 60 * 1000) } } })
        .catch(() => undefined);
    }

    return {
      ok: record.count <= limit,
      limit,
      remaining: Math.max(0, limit - record.count),
      retryAfterSeconds,
    };
  } catch (error) {
    // Fail OPEN. This limiter protects a contact form and a login page, not a
    // payment endpoint; a database hiccup must not take the site down with it.
    // Login has a second, independent control in Supabase's own throttling.
    logger.error('ratelimit.failed', { key, ...serialiseError(error) });
    return { ok: true, limit, remaining: limit, retryAfterSeconds: 0 };
  }
}

/** Limits tuned for a low-traffic marketing site. */
export const RATE_LIMITS = {
  contactForm: { limit: 5, windowSeconds: 60 * 60 },
  login: { limit: 10, windowSeconds: 15 * 60 },
  upload: { limit: 60, windowSeconds: 60 * 60 },
} as const;
