/**
 * Join class names, dropping anything falsy.
 *
 * Deliberately not clsx + tailwind-merge: this codebase composes classes from
 * literals and conditionals, never by overriding a base component's utilities,
 * so conflict resolution would be two dependencies solving a problem we do not
 * have.
 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}
