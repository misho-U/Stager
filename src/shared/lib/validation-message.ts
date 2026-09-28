import { SLUG_PATTERN } from '@/shared/types/api';

/** Keys under `admin.validation` in the dashboard's message files. */
export type ValidationKey =
  | 'required'
  | 'tooShort'
  | 'tooLong'
  | 'tooSmall'
  | 'tooBig'
  | 'number'
  | 'email'
  | 'url'
  | 'slug'
  | 'youtube'
  | 'invalid';

export type ValidationMessage = { key: ValidationKey; values?: Record<string, number> };

/**
 * What a live zod issue and an issue sent back in a 422 (ApiValidationIssue)
 * have in common: which check failed, and the limit it broke.
 */
export type IssueLike = {
  code: string;
  origin?: string;
  format?: string;
  minimum?: number | bigint;
  maximum?: number | bigint;
  pattern?: RegExp | string;
  params?: Record<string, unknown>;
  expected?: string;
  errors?: IssueLike[][];
  /** The value that failed. Live issues only: a 422 never echoes input back. */
  input?: unknown;
};

/**
 * A pattern's source, however it arrives. zod reports a failed regex as the
 * regex written out ("/^…$/"), slashes and flags included; a 422 carries the
 * bare source.
 */
function patternSource(pattern: RegExp | string | undefined): string | undefined {
  if (pattern instanceof RegExp) return pattern.source;
  return pattern?.replace(/^\/([\s\S]*)\/[a-z]*$/, '$1');
}

/** Refinements that name their own message, through `params: { key }`. */
const CUSTOM_KEYS: ReadonlySet<string> = new Set<ValidationKey>(['youtube']);

/**
 * Which plain-language message fits a validation problem.
 *
 * Decided from what failed — the check and its limit — and never from the
 * schema's own wording, which is why the shared schemas carry none: the same
 * problem is then said in Georgian or English, whichever the dashboard is in.
 * Used for the live form (useValidationErrorMap) and for a 422 from the API
 * (toFieldErrors).
 */
export function describeIssue(issue: IssueLike): ValidationMessage {
  // Nothing typed at all is "fill this in", whatever check it then failed:
  // "use at least 8 characters" or "enter a valid email" for an empty box
  // answers a question nobody asked.
  if (issue.input === '' && (issue.code === 'too_small' || issue.code === 'invalid_format')) {
    return { key: 'required' };
  }

  switch (issue.code) {
    case 'too_small': {
      const min = Number(issue.minimum);
      if (issue.origin === 'string' || issue.origin === 'array') {
        return min <= 1 ? { key: 'required' } : { key: 'tooShort', values: { min } };
      }
      return { key: 'tooSmall', values: { min } };
    }

    case 'too_big': {
      const max = Number(issue.maximum);
      return issue.origin === 'string' || issue.origin === 'array'
        ? { key: 'tooLong', values: { max } }
        : { key: 'tooBig', values: { max } };
    }

    // A value that is missing altogether arrives as undefined or null.
    case 'invalid_type':
      return issue.expected === 'number' ? { key: 'number' } : { key: 'required' };

    case 'invalid_format': {
      if (issue.format === 'email') return { key: 'email' };
      if (issue.format === 'url') return { key: 'url' };
      return patternSource(issue.pattern) === SLUG_PATTERN.source
        ? { key: 'slug' }
        : { key: 'invalid' };
    }

    case 'custom': {
      const key = issue.params?.key;
      return typeof key === 'string' && CUSTOM_KEYS.has(key)
        ? { key: key as ValidationKey }
        : { key: 'invalid' };
    }

    // "Either an email or blank": report why the first alternative failed.
    case 'invalid_union': {
      const first = issue.errors?.[0]?.[0];
      return first ? describeIssue(first) : { key: 'invalid' };
    }

    default:
      return { key: 'invalid' };
  }
}
