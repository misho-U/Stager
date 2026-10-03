import { createItemRoutes } from '@/app/api/_lib/crud-route';
import {
  deleteVideo,
  getAdminVideo,
  updateVideo,
} from '@/app/api/_lib/repositories/video.repository';
import {
  videoUpdateInputSchema,
  type AdminVideo,
  type VideoUpdateInput,
} from '@/entity/video/model/video.model';

export const dynamic = 'force-dynamic';

export const { GET, PATCH, DELETE } = createItemRoutes<AdminVideo, VideoUpdateInput>({
  entity: 'video',
  entityType: 'Video',
  updateSchema: videoUpdateInputSchema,
  get: getAdminVideo,
  update: updateVideo,
  remove: deleteVideo,
  cacheKeyOf: (video) => video.slug,
  auditSummary: (video) => ({ slug: video.slug, status: video.status }),
  notFoundMessage: 'Video not found',
  conflict: { field: 'slug', message: 'A video with this slug already exists' },
});
