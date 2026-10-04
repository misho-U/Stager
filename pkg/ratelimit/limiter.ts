import 'server-only';

import { after } from 'next/server';

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
    // invisible, frequent enough that the table never grows unbounded. It runs
    // in after(), which keeps the function alive until it finishes: a promise
    // left dangling can be frozen mid-query once the response is sent. The
    // daily cron prunes too, in case this never gets the chance.
    if (Math.random() < 0.01) {
      after(async () => {
        try {
          await pruneRateLimits(now);
        } catch (error) {
          logger.warn('ratelimit.prune_failed', serialiseError(error));
        }
      });
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

/** Longer than the longest window below, so a pruned window never still counted. */
const KEEP_WINDOWS_MS = 24 * 60 * 60 * 1000;

/** Deletes windows that can no longer limit anyone; returns how many. */
export async function pruneRateLimits(now = Date.now()): Promise<number> {
  const { count } = await prisma.rateLimit.deleteMany({
    where: { windowStart: { lt: new Date(now - KEEP_WINDOWS_MS) } },
  });
  return count;
}

/** Limits tuned for a low-traffic marketing site. */
export const RATE_LIMITS = {
  contactForm: { limit: 5, windowSeconds: 60 * 60 },
  login: { limit: 10, windowSeconds: 15 * 60 },
  // Per account, whatever the address: guessing one admin's password from
  // many machines is capped too. High enough that the owner, retrying after a
  // typo, never meets it.
  loginAccount: { limit: 30, windowSeconds: 60 * 60 },
  upload: { limit: 60, windowSeconds: 60 * 60 },
} as const;
