import Image from 'next/image';

import { cn } from '@/shared/lib/cn';
import { Wordmark } from '@/shared/components/wordmark';

type Logo = {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
};

/** The ratio of the artwork the client uploaded, for an image stored without its size. */
const FALLBACK_SIZE = { width: 320, height: 100 };

/**
 * The site's brand in the header and footer: the logo uploaded under
 * Dashboard → Settings → Logo, or, while none is, the STAGER wordmark set in
 * type. The site is dark only, so pick the light logo first (see
 * `siteLogo`). Saving the settings purges the layout's tag, so a new logo is
 * on the site at the next request.
 *
 * Inside a link that already carries the site's name (the header), pass
 * `decorative` so a screen reader does not hear the name twice.
 */
export function BrandMark({
  logo,
  name,
  decorative = false,
  priority = false,
  className,
  wordmarkClassName,
  testId,
}: {
  logo: Logo | null;
  /** The site's name: the image's text when nothing around it says it. */
  name: string;
  decorative?: boolean;
  /** For the header: on screen at once, so it is not lazy-loaded. */
  priority?: boolean;
  /** Sets the logo's height; its width follows the artwork. */
  className?: string;
  wordmarkClassName?: string;
  /** The wordmark's test id (header `wordmark`, footer `footer-wordmark`). */
  testId?: string;
}) {
  if (!logo) return <Wordmark className={wordmarkClassName} testId={testId} />;

  const size =
    logo.width && logo.height ? { width: logo.width, height: logo.height } : FALLBACK_SIZE;

  return (
    <Image
      src={logo.url}
      alt={decorative ? '' : logo.alt || name}
      width={size.width}
      height={size.height}
      // Shown at most ~200 CSS px wide; 2× for sharp edges on a dense screen.
      sizes="200px"
      priority={priority}
      // Never wider than the space it is given: in a phone's header a wide
      // logo scales down rather than push the menu button out of the bar.
      className={cn('block w-auto max-w-full object-contain object-left', className)}
      data-testid="brand-logo"
    />
  );
}

/** The logo for the site's dark pages: the light one, else the primary. */
export function siteLogo<T>(layout: { logo: T | null; logoLight: T | null } | null): T | null {
  return layout?.logoLight ?? layout?.logo ?? null;
}
