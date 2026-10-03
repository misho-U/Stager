import {
  adminVideoSchema,
  type AdminVideo,
  type VideoInput,
  type VideoUpdateInput,
} from '@/entity/video/model/video.model';
import { createCrudApi } from '@/shared/lib/crud-resource';

export const videoApi = createCrudApi<AdminVideo, VideoInput, VideoUpdateInput>({
  basePath: '/api/admin/videos',
  recordSchema: adminVideoSchema,
});
