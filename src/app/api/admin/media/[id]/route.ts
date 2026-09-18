import { readJson, recordAudit, withAdmin } from '@/app/api/_lib/route-helpers';
import { deleteMedia, getMedia, updateMedia } from '@/app/api/_lib/repositories/media.repository';
import { mediaUpdateInputSchema } from '@/entity/media/model/media.model';
import { deleteBlob } from '@pkg/blob/storage';
import { revalidateEntity } from '@pkg/cache/revalidate';
import { apiFail, apiNoContent, apiOk } from '@pkg/http/api-response';

export const dynamic = 'force-dynamic';

type Params = { id: string };

export const PATCH = withAdmin<Params>(async ({ request, session, params }) => {
  const parsed = await readJson(request, mediaUpdateInputSchema);
  if (!parsed.ok) return parsed.response;

  const media = await updateMedia(params.id, parsed.data);
  if (!media) return apiFail('NOT_FOUND', 'Image not found');

  await recordAudit({
    request,
    session,
    action: 'UPDATE',
    entityType: 'Media',
    entityId: media.id,
  });

  revalidateEntity('media');

  return apiOk(media);
});

export const DELETE = withAdmin<Params>(async ({ request, session, params }) => {
  const existing = await getMedia(params.id);
  if (!existing) return apiFail('NOT_FOUND', 'Image not found');

  const result = await deleteMedia(params.id);

  if (result.inUse) {
    return apiFail(
      'CONFLICT',
      'This image is still used by other content. Remove it there first, then delete it here.',
    );
  }

  if (!result.deleted) return apiFail('NOT_FOUND', 'Image not found');

  // Row first, blob second: a failed blob delete leaves a harmless orphan,
  // whereas the reverse would leave content pointing at a missing file.
  if (result.url) await deleteBlob(result.url);

  await recordAudit({
    request,
    session,
    action: 'DELETE',
    entityType: 'Media',
    entityId: params.id,
    diff: { before: { pathname: existing.pathname } },
  });

  revalidateEntity('media');

  return apiNoContent();
});
