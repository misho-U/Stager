import 'server-only';

import { storeHostFromToken } from '@pkg/blob/store-host';
import { serverEnv } from '@pkg/config/env.server';

/**
 * The host this project's public blobs are served from, e.g.
 * `abc123.public.blob.vercel-storage.com`; null without a real token. See
 * `storeHostFromToken`, which next.config.ts uses to pin the image optimizer
 * to the same host.
 */
export function blobStoreHost(): string | null {
  return storeHostFromToken(serverEnv.BLOB_READ_WRITE_TOKEN);
}
