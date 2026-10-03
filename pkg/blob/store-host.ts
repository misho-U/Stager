/**
 * The host a Vercel Blob store serves its public files from, e.g.
 * `abc123.public.blob.vercel-storage.com`, worked out from the store's
 * read-write token.
 *
 * Derived exactly as @vercel/blob derives it (`parseStoreIdFromReadWriteToken`
 * and `constructBlobUrl`): the store id is the fourth `_`-separated part of the
 * token. Only that public part is used. Null when the token does not have that
 * shape, as with a placeholder in development.
 *
 * Every other `*.public.blob.vercel-storage.com` host belongs to some other
 * Vercel customer, so "ends with the blob domain" is not a check.
 *
 * Imports nothing, so next.config.ts can use it at build time too.
 */
export function storeHostFromToken(token: string | undefined): string | null {
  const storeId = token?.split('_')[3];
  return storeId && /^[a-z0-9-]+$/i.test(storeId)
    ? `${storeId.toLowerCase()}.public.blob.vercel-storage.com`
    : null;
}
