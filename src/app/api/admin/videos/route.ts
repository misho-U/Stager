import { createCollectionRoutes } from '@/app/api/_lib/crud-route';
import { createVideo, listAdminVideos } from '@/app/api/_lib/repositories/video.repository';
import {
  videoInputSchema,
  type AdminVideo,
  type VideoInput,
} from '@/entity/video/model/video.model';

export const dynamic = 'force-dynamic';

export const { GET, POST } = createCollectionRoutes<AdminVideo, VideoInput>({
  entity: 'video',
  entityType: 'Video',
  inputSchema: videoInputSchema,
  list: listAdminVideos,
  create: createVideo,
  idOf: (video) => video.id,
  cacheKeyOf: (video) => video.slug,
  auditSummary: (video) => ({ slug: video.slug, status: video.status }),
  conflict: { field: 'slug', message: 'A video with this slug already exists' },
});
