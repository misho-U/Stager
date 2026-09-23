import { z } from 'zod';

import { readJson, withPublic } from '@/app/api/_lib/route-helpers';
import { revalidateEntity } from '@pkg/cache/revalidate';
import { CONTENT_ENTITIES, tagsToRevalidate } from '@pkg/cache/tags';
import { isCacheProbeEnabled } from '@pkg/config/env.server';
import { apiFail, apiOk } from '@pkg/http/api-response';
import { isSameOriginRequest } from '@pkg/security/request';

/**
 * Cache probe — the only way to test the edit→live loop without credentials.
 *
 * The promise this whole build rests on is "edit in /admin, see it on the
 * site". Until this existed, the single test covering that promise
 * (tests/e2e/admin-content-flow.spec.ts) was `test.skip()` unless
 * E2E_ADMIN_EMAIL/PASSWORD were set — so it had never run, and a broken
 * invalidation shipped unnoticed. A test that needs credentials nobody has is
 * not coverage.
 *
 * WHY THIS ONLY BUSTS A CACHE AND NEVER WRITES:
 * a dev server is routinely reachable on the LAN, and in this project
 * .env.local points at the same Supabase database production uses — so an
 * unauthenticated write endpoint here could corrupt real site content. This
 * endpoint therefore performs no database write whatsoever. The Playwright
 * spec makes its own edit through Prisma and restores it in a `finally`,
 * keeping the destructive half in test code that never ships to a server.
 *
 * Purging a cache tag is idempotent and costs at most one extra database read,
 * so the worst an exposed call can do is make the next request slightly slower.
 *
 * Two independent gates, because one is a single typo away from being none:
 *   1. never in production, regardless of any env var;
 *   2. off unless ENABLE_CACHE_PROBE=1 is set explicitly.
 * A blocked call 404s rather than 403s — an endpoint that denies you is an
 * endpoint you know exists.
 */

export const dynamic = 'force-dynamic';

const probeSchema = z.object({
  entity: z.enum(CONTENT_ENTITIES),
  key: z.string().min(1).nullish(),
});

export const POST = withPublic(async ({ request }) => {
  if (!isCacheProbeEnabled) return apiFail('NOT_FOUND', 'Not found');

  // Mutating verb, so the same cross-site rule the admin routes use applies.
  if (!isSameOriginRequest(request)) {
    return apiFail('FORBIDDEN', 'Cross-site request rejected');
  }

  const body = await readJson(request, probeSchema);
  if (!body.ok) return body.response;

  const { entity, key } = body.data;
  revalidateEntity(entity, key);

  // Returned so the test asserts against the tags actually purged rather than
  // assuming the registry and the call agree.
  return apiOk({ entity, key: key ?? null, tags: tagsToRevalidate(entity, key) });
});
