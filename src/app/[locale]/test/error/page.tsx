import { notFound } from 'next/navigation';

import { isCacheProbeEnabled } from '@pkg/config/env.server';

export const dynamic = 'force-dynamic';

/**
 * Throws on purpose, so the tests can see the public error page
 * (app/[locale]/error.tsx) do its job. It exists only where the cache probe
 * does (pkg/config/env.server.ts): never on Vercel, and never on a production
 * server outside CI. Everywhere else it is a 404.
 */
export default function ErrorProbePage() {
  if (!isCacheProbeEnabled) notFound();
  throw new Error('error-probe: thrown on purpose by a test page');
}
