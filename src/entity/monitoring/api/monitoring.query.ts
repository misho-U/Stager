import { useMutation } from '@tanstack/react-query';

import { sendTestError } from '@/entity/monitoring/api/monitoring.api';

export function useSendTestError() {
  return useMutation({ mutationFn: sendTestError });
}
