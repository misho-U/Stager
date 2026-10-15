import { cn } from '@/shared/lib/cn';

/**
 * The STAGER wordmark, set in type: what the header and footer show while no
 * logo is uploaded under Dashboard → Settings (`BrandMark`). Always
 * in the brand face (`font-brand`), so it is the same mark on /ka, where the
 * text around it takes another Latin.
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
      className={cn('font-brand tracking-wordmark font-semibold whitespace-nowrap', className)}
      data-testid={testId}
    >
      STAGER
    </span>
  );
}
