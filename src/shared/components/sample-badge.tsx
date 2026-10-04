import { cn } from '@/shared/lib/cn';

/**
 * TEMPORARY: marks a section whose entries are invented for the design
 * comparison (Academy courses and videos, until the dashboard holds them),
 * so a sample can never pass for the real thing. Its title is the longer
 * explanation, read on hover and by screen readers.
 */
export function SampleBadge({
  label,
  hint,
  className,
}: {
  label: string;
  hint: string;
  className?: string;
}) {
  return (
    <span
      data-testid="sample-badge"
      title={hint}
      className={cn(
        'text-caption border-line-strong text-ink-muted inline-flex min-h-7 items-center rounded-full border px-3 font-medium',
        className,
      )}
    >
      {label}
      <span className="sr-only">{`: ${hint}`}</span>
    </span>
  );
}
