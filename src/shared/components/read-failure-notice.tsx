/**
 * Shown when a public read failed (logged server-side as `public.read_failed`).
 *
 * The page must say so rather than quietly render around the gap: a dead API
 * once hid for days behind a page that merely looked fine (CLAUDE.md).
 */
export function ReadFailureNotice({ message }: { message: string }) {
  return (
    <div
      role="alert"
      data-testid="read-failure"
      className="border-danger bg-surface-raised px-gutter text-body-sm text-danger border-b py-3"
    >
      {message}
    </div>
  );
}
