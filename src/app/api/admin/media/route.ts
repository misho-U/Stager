import { readJson, recordAudit, withAdmin } from '@/app/api/_lib/route-helpers';
import { listMedia, registerMedia } from '@/app/api/_lib/repositories/media.repository';
import { mediaRegisterInputSchema } from '@/entity/media/model/media.model';
import { isAllowedImageType } from '@pkg/blob/constraints';
import { revalidateEntity } from '@pkg/cache/revalidate';
import { apiCreated, apiFail, apiOk } from '@pkg/http/api-response';

export const dynamic = 'force-dynamic';

export const GET = withAdmin(async () => apiOk(await listMedia()));

/**
 * Record a blob the browser has just uploaded.
 *
 * The content type is re-checked here even though the upload token already
 * constrained it: this endpoint is reachable on its own, and an admin session
 * should not be able to register a row pointing at an arbitrary file.
 */
export const POST = withAdmin(async ({ request, session }) => {
  const parsed = await readJson(request, mediaRegisterInputSchema);
  if (!parsed.ok) return parsed.response;

  if (!isAllowedImageType(parsed.data.contentType)) {
    return apiFail('UNSUPPORTED_MEDIA_TYPE', 'Only JPEG, PNG, WebP and AVIF images are allowed');
  }

  // The URL must belong to our blob store — otherwise a Media row could point
  // at any host on the internet and be rendered as site content.
  let host: string;
  try {
    host = new URL(parsed.data.url).hostname;
  } catch {
    return apiFail('BAD_REQUEST', 'Invalid upload URL');
  }

  if (!host.endsWith('.public.blob.vercel-storage.com')) {
    return apiFail('BAD_REQUEST', 'Upload URL must point at the project blob store');
  }

  const media = await registerMedia(parsed.data, session.adminUserId);

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
