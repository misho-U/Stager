import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  deleteMedia,
  fetchMediaList,
  registerMedia,
  updateMedia,
} from '@/entity/media/api/media.api';
import type { MediaRegisterInput, MediaUpdateInput } from '@/entity/media/model/media.model';

export const mediaKeys = {
  all: ['media'] as const,
  lists: () => ['media', 'list'] as const,
};

export const mediaListQuery = () =>
  queryOptions({
    queryKey: mediaKeys.lists(),
    queryFn: fetchMediaList,
  });

export function useRegisterMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MediaRegisterInput) => registerMedia(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: mediaKeys.all }),
  });
}

export function useUpdateMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MediaUpdateInput }) => updateMedia(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: mediaKeys.all }),
  });
}

export function useDeleteMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMedia(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: mediaKeys.all }),
  });
}
