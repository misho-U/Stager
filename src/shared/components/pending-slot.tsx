import { cn } from '@/shared/lib/cn';

/**
 * Marks where CMS content has not been written yet.
 *
 * Deliberately unmistakable — a dashed frame and a sentence saying what goes
 * here — so an empty section can never pass for a finished one. Invented
 * placeholder copy that reads like real content is exactly what CLAUDE.md
 * forbids.
 */
export function PendingSlot({
  label,
  hint,
  className,
}: {
  label: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'border-line-input flex flex-col gap-1 rounded-md border border-dashed px-5 py-4',
        className,
      )}
      data-pending-content
    >
      <p className="text-body-sm text-ink-muted font-medium">{label}</p>
      {hint ? <p className="text-caption text-ink-muted">{hint}</p> : null}
    </div>
  );
}
