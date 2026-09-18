import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import { fetchAdminPage, fetchAdminPages, updateAdminPage } from '@/entity/page/api/page.api';
import type { PageUpdateInput } from '@/entity/page/model/page.model';
import type { PageKey } from '@/shared/types/enums';

export const pageKeys = {
  all: ['pages'] as const,
  lists: () => ['pages', 'list'] as const,
  detail: (key: PageKey) => ['pages', 'detail', key] as const,
};

export const adminPagesQuery = () =>
  queryOptions({ queryKey: pageKeys.lists(), queryFn: fetchAdminPages });

export const adminPageQuery = (key: PageKey) =>
  queryOptions({ queryKey: pageKeys.detail(key), queryFn: () => fetchAdminPage(key) });

export function useUpdatePage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, input }: { key: PageKey; input: PageUpdateInput }) =>
      updateAdminPage(key, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pageKeys.all }),
  });
}
