import { timingSafeEqual } from 'node:crypto';

import { notifyInquiry } from '@/app/api/_lib/notify-inquiry';
import { withPublic } from '@/app/api/_lib/route-helpers';
import { serverEnv } from '@pkg/config/env.server';
import { prisma } from '@pkg/db/prisma';
import { apiFail, apiOk } from '@pkg/http/api-response';
import { logger } from '@pkg/logger';
import { isEmailConfigured } from '@pkg/mail/resend';
import { pruneRateLimits } from '@pkg/ratelimit/limiter';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

/** How many failed inquiry emails one run retries: a backlog drains over days. */
const RETRY_BATCH = 20;

function fromScheduler(authorization: string | null): boolean {
  const secret = serverEnv.CRON_SECRET;
  if (!secret || !authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(authorization);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Once a day (vercel.json `crons`, production deployments only):
 *
 *  - retries inquiry emails that failed: not notified, older than ten minutes
 *    (so never racing the first attempt), newer than a week;
 *  - prunes audit entries older than a year and rate-limit windows older than
 *    a day, so neither table grows for ever;
 *  - and, by querying at all, keeps a Free Supabase project from pausing.
 *
 * Vercel sends `Authorization: Bearer <CRON_SECRET>`. Without CRON_SECRET set,
 * the job refuses every caller.
 */
export const GET = withPublic(async ({ request }) => {
  if (!fromScheduler(request.headers.get('authorization'))) {
    return apiFail('UNAUTHENTICATED', 'Only the scheduler may run this');
  }

  const now = Date.now();

  // While email is off (Resend not set up yet) every retry would fail and log
  // an error, every day; inquiries wait in the dashboard instead.
  const pending = !isEmailConfigured
    ? []
    : await prisma.contactInquiry.findMany({
        where: {
          notifiedAt: null,
          createdAt: { lt: new Date(now - 10 * MINUTE), gt: new Date(now - 7 * DAY) },
        },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
        take: RETRY_BATCH,
      });

  let notified = 0;
  for (const { id } of pending) {
    if (await notifyInquiry(id)) notified += 1;
  }

  const audit = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: new Date(now - 365 * DAY) } },
  });
  const rateLimitsPruned = await pruneRateLimits(now);

  const summary = {
    mail: isEmailConfigured ? 'on' : 'off',
    retried: pending.length,
    notified,
    auditPruned: audit.count,
    rateLimitsPruned,
  };
  logger.info('cron.daily', summary);
  return apiOk(summary);
});
