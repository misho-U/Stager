import 'server-only';

import { serverEnv } from '@pkg/config/env.server';

/**
 * The host this project's public blobs are served from, e.g.
 * `abc123.public.blob.vercel-storage.com`.
 *
 * Derived exactly as @vercel/blob derives it (`parseStoreIdFromReadWriteToken`
 * and `constructBlobUrl`): the store id is the fourth `_`-separated part of the
 * read-write token. Only that public part is used. Null when the token does not
 * have that shape, as with a placeholder in development.
 *
 * Every other `*.public.blob.vercel-storage.com` host belongs to some other
 * Vercel customer, so "ends with the blob domain" is not a check.
 */
export function blobStoreHost(): string | null {
  const storeId = serverEnv.BLOB_READ_WRITE_TOKEN.split('_')[3];
  return storeId ? `${storeId.toLowerCase()}.public.blob.vercel-storage.com` : null;
}
