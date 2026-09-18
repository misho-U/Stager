import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import { fetchCurrentSession, login, logout } from '@/entity/session/api/session.api';
import type { LoginInput } from '@/entity/session/model/session.model';

export const sessionKeys = {
  current: ['session', 'current'] as const,
};

export const currentSessionQuery = () =>
  queryOptions({
    queryKey: sessionKeys.current,
    queryFn: fetchCurrentSession,
    // A stale session shows the wrong name in the header at worst; refetching
    // it on every focus is noise.
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionKeys.current }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => logout(),
    // Drop everything: the next user of this browser must not see cached
    // drafts or inquiry contents from the session that just ended.
    onSuccess: () => queryClient.clear(),
  });
}
