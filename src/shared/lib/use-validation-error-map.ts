'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import type * as z4 from 'zod/v4/core';

import { describeIssue, type IssueLike } from '@/shared/lib/validation-message';

/**
 * A zod error map that words each problem in the dashboard's language.
 *
 * Pass it to zodResolver per form — `zodResolver(schema, { error })` — rather
 * than setting it globally: the same schemas validate on the server and on the
 * public site, which have their own wording.
 */
export function useValidationErrorMap() {
  const t = useTranslations('admin.validation');

  return useCallback(
    (issue: z4.$ZodRawIssue) => {
      const { key, values } = describeIssue(issue as unknown as IssueLike);
      return t(key, values);
    },
    [t],
  );
}
