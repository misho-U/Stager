/**
 * `setValueAs` for an optional number input: blank means null.
 *
 * react-hook-form calls setValueAs with the stored value too — when a field
 * mounts and when the form resets — not only with the text typed into it. The
 * obvious `value === '' ? null : Number(value)` therefore turns a stored null
 * into Number(null), which is 0, and the schema's range check rejects a field
 * nobody filled in: a project with no year could not be saved ("expected
 * number to be >=1900").
 */
export function toOptionalNumber(value: string | number | null | undefined): number | null {
  return value === '' || value === null || value === undefined ? null : Number(value);
}
