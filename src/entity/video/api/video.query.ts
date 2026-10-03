import { videoApi } from '@/entity/video/api/video.api';
import type { AdminVideo, VideoInput, VideoUpdateInput } from '@/entity/video/model/video.model';
import { createCrudQueries } from '@/shared/lib/crud-resource';

export const {
  keys: videoKeys,
  listQuery: adminVideosQuery,
  detailQuery: adminVideoQuery,
  useCreate: useCreateVideo,
  useUpdate: useUpdateVideo,
  useDelete: useDeleteVideo,
} = createCrudQueries<AdminVideo, VideoInput, VideoUpdateInput>({
  resource: 'videos',
  api: videoApi,
});
