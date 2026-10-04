import { head, type HeadBlobResult } from '@vercel/blob';

import { readJson, recordAudit, withAdmin } from '@/app/api/_lib/route-helpers';
import {
  listMedia,
  mediaUrlTaken,
  registerMedia,
} from '@/app/api/_lib/repositories/media.repository';
import { mediaRegisterInputSchema } from '@/entity/media/model/media.model';
import { BLOB_PATH_PREFIX, isAllowedImageType, MAX_UPLOAD_BYTES } from '@pkg/blob/constraints';
import { blobStoreHost } from '@pkg/blob/store';
import { revalidateEntity } from '@pkg/cache/revalidate';
import { serverEnv } from '@pkg/config/env.server';
import { apiCreated, apiFail, apiOk } from '@pkg/http/api-response';

export const dynamic = 'force-dynamic';

export const GET = withAdmin(async () => apiOk(await listMedia()));

/**
 * Record a blob the browser has just uploaded.
 *
 * This endpoint is reachable on its own, so nothing the browser says is taken
 * on trust: the file must be in THIS project's store (any other Vercel
 * customer's store has the same domain), under media/, and its type and size
 * are read from the store itself. A second row for a file already registered
 * is refused: deleting one of the two would delete the file the other uses.
 */
export const POST = withAdmin(async ({ request, session }) => {
  const parsed = await readJson(request, mediaRegisterInputSchema);
  if (!parsed.ok) return parsed.response;

  if (!isAllowedImageType(parsed.data.contentType)) {
    return apiFail('UNSUPPORTED_MEDIA_TYPE', 'Only JPEG, PNG, WebP and AVIF images are allowed');
  }

  // The URL must belong to our blob store — otherwise a Media row could point
  // at any host on the internet and be rendered as site content.
  let url: URL;
  try {
    url = new URL(parsed.data.url);
  } catch {
    return apiFail('BAD_REQUEST', 'Invalid upload URL');
  }

  const store = blobStoreHost();
  if (
    url.protocol !== 'https:' ||
    !store ||
    url.hostname !== store ||
    !url.pathname.startsWith(`/${BLOB_PATH_PREFIX}/`)
  ) {
    return apiFail('BAD_REQUEST', 'Upload URL must point at the project blob store');
  }

  let blob: HeadBlobResult;
  try {
    blob = await head(url.toString(), { token: serverEnv.BLOB_READ_WRITE_TOKEN });
  } catch {
    return apiFail('BAD_REQUEST', 'The upload was not found in the project blob store');
  }

  if (!isAllowedImageType(blob.contentType)) {
    return apiFail('UNSUPPORTED_MEDIA_TYPE', 'Only JPEG, PNG, WebP and AVIF images are allowed');
  }
  if (blob.size > MAX_UPLOAD_BYTES) {
    return apiFail('PAYLOAD_TOO_LARGE', 'The file is too large');
  }
  if (await mediaUrlTaken(blob.url)) {
    return apiFail('CONFLICT', 'This file is already in the media library');
  }

  const media = await registerMedia(
    {
      ...parsed.data,
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
      size: blob.size,
    },
    session.adminUserId,
  );

  await recordAudit({
    request,
    session,
    action: 'CREATE',
    entityType: 'Media',
    entityId: media.id,
    diff: { after: { pathname: media.pathname, size: media.size } },
  });

  revalidateEntity('media');

  return apiCreated(media);
});
