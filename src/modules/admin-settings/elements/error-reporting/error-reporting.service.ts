'use client';

import { useState } from 'react';

import { useSendTestError } from '@/entity/monitoring/api/monitoring.query';
import { useFormErrors } from '@/shared/lib/form-errors';

export function useErrorReportingCheck() {
  const formErrors = useFormErrors();
  const sendTestError = useSendTestError();
  const [result, setResult] = useState<'sent' | 'off' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setResult(null);
    setError(null);
    try {
      const { sent } = await sendTestError.mutateAsync();
      setResult(sent ? 'sent' : 'off');
    } catch (caught) {
      setError(formErrors.message(caught));
    }
  };

  return { send, isSending: sendTestError.isPending, result, error };
}
