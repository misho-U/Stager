import 'server-only';

import { del } from '@vercel/blob';

import { serverEnv } from '@pkg/config/env.server';
import { logger, serialiseError } from '@pkg/logger';

/**
 * Remove an object from the blob store.
 *
 * Never throws: an orphaned blob costs a few cents, whereas a failed delete
 * that aborts the surrounding transaction would leave the Media row pointing at
 * a file the admin thinks they removed. The database is the source of truth;
 * blob cleanup is best-effort.
 */
export async function deleteBlob(url: string): Promise<boolean> {
  try {
    await del(url, { token: serverEnv.BLOB_READ_WRITE_TOKEN });
    return true;
  } catch (error) {
    logger.warn('blob.delete_failed', { url, ...serialiseError(error) });
    return false;
  }
}
