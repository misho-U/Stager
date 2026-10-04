import { cn } from '@/shared/lib/cn';

/**
 * The STAGER wordmark, set in type until the logo artwork is added to the
 * repository (uploads refuse SVG — see AGENTS.md § Security rules).
 *
 * `data-testid="wordmark"` is load-bearing: the typography tests use this
 * Latin-only string to prove the Latin font file loads, and they expect one
 * per page. A second instance (a footer) passes its own `testId`.
 */
export function Wordmark({
  className,
  testId = 'wordmark',
}: {
  className?: string;
  testId?: string;
}) {
  return (
    <span
      className={cn('tracking-wordmark font-semibold whitespace-nowrap', className)}
      data-testid={testId}
    >
      STAGER
    </span>
  );
}
