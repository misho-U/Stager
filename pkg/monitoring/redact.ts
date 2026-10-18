/**
 * Takes email addresses and phone numbers out of text bound for Sentry.
 *
 * The scrubber drops a request's body, but an error's own words can quote it:
 * a database error prints the values of the query that failed, and a mail
 * provider names the address it refused. Whatever text an event carries (its
 * message, each exception's value, its extra data, a breadcrumb) passes
 * through here first.
 */

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.\p{L}{2,}/gu;

/**
 * A run of digits with the separators a phone number is written with, not
 * inside a word, nor part of a time ("10:32"). Long enough to be a number a
 * person can be called on: a Georgian mobile has nine digits without +995.
 * A date or a version has fewer and is left alone.
 */
const PHONE = /(?<![\p{L}\p{N}_+(])\(?\+?\d[\d ().-]{6,}\d(?![\p{L}\p{N}_:])/gu;
const PHONE_MIN_DIGITS = 9;

/** Nested data is followed this far; deeper than that is dropped. */
const MAX_DEPTH = 8;

export function redactText(text: string): string {
  return text
    .replace(EMAIL, '[email]')
    .replace(PHONE, (match) =>
      match.replace(/\D/g, '').length >= PHONE_MIN_DIGITS ? '[phone]' : match,
    );
}

/** The same through every string in a value: objects, arrays and all. */
export function redactValue(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return redactText(value);
  if (depth >= MAX_DEPTH) return '[too deep]';
  if (Array.isArray(value)) return value.map((item) => redactValue(item, depth + 1));
  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, redactValue(item, depth + 1)]),
    );
  }
  return value;
}
