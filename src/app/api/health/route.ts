import { NextResponse } from 'next/server';

import { withPublic } from '@/app/api/_lib/route-helpers';
import { prisma } from '@pkg/db/prisma';
import { withTimeout } from '@pkg/http/timeout';
import { logger, serialiseError } from '@pkg/logger';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * Can the site answer? One query to the database, with a time limit.
 *
 * For an uptime monitor, which alerts when it fails, and whose regular visits
 * also keep a Free Supabase project from pausing after a quiet week. Public,
 * so it says nothing beyond ok or not.
 */
export const GET = withPublic(async () => {
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 5_000, 'Health query');
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    logger.error('health.database_unreachable', serialiseError(error));
    return NextResponse.json({ ok: false }, { status: 503, headers: NO_STORE });
  }
});
