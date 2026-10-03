import type { ZodError } from 'zod';

import type { ApiValidationIssue } from '@pkg/http/api-error';

/** "/^[a-z]+$/" → "^[a-z]+$". */
function patternSource(pattern: RegExp | string): string {
  if (pattern instanceof RegExp) return pattern.source;
  return pattern.replace(/^\/([\s\S]*)\/[a-z]*$/, '$1');
}

/**
 * The parts of a zod issue that say what failed and by how much, without the
 * words — what a 422 sends so the dashboard can word it in its own language
 * (src/shared/lib/validation-message.ts). Never the submitted value.
 */
export function toValidationIssue(issue: ZodError['issues'][number]): ApiValidationIssue {
  const { origin, format, minimum, maximum, pattern, params, expected } = issue as Partial<{
    origin: string;
    format: string;
    minimum: number | bigint;
    maximum: number | bigint;
    // The regex written out, "/^…$/": zod does not hand back the RegExp.
    pattern: RegExp | string;
    params: Record<string, unknown>;
    expected: string;
  }>;

  return {
    code: issue.code,
    ...(origin ? { origin } : {}),
    ...(format ? { format } : {}),
    ...(minimum !== undefined ? { minimum: Number(minimum) } : {}),
    ...(maximum !== undefined ? { maximum: Number(maximum) } : {}),
    ...(pattern ? { pattern: patternSource(pattern) } : {}),
    ...(params ? { params } : {}),
    ...(expected ? { expected } : {}),
  };
}
