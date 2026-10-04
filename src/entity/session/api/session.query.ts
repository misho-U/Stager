import { useMutation, useQueryClient } from '@tanstack/react-query';

import { login, logout } from '@/entity/session/api/session.api';
import type { LoginInput } from '@/entity/session/model/session.model';

/** The dashboard reads who is signed in on the server (its layout), not here. */
export function useLogin() {
  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
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
