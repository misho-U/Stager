import { ArrowDownIcon } from '@phosphor-icons/react/dist/ssr/ArrowDown';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

const TONES = {
  solid: 'bg-primary text-on-primary hover:bg-primary-hover',
  outline: 'border border-ink text-ink hover:border-primary hover:bg-primary hover:text-on-primary',
  text: 'px-0 text-ink underline decoration-line-strong underline-offset-8 hover:decoration-ink',
} as const;

const SIZES = {
  md: 'min-h-11 px-5 text-body',
  lg: 'min-h-13 px-7 text-body-lg',
} as const;

const ICONS = { right: ArrowRightIcon, down: ArrowDownIcon } as const;

type CtaLinkProps = {
  href: string;
  children: ReactNode;
  tone?: keyof typeof TONES;
  size?: keyof typeof SIZES;
  /** Arrow after the label: "down" for a jump further down this page. */
  icon?: keyof typeof ICONS;
  className?: string;
};

/**
 * A call to action that navigates — an <a>, never a <button>, because it goes
 * somewhere. Colour and corner radius come from the design's tokens, so the
 * same component reads correctly in every variant and on dark bands.
 */
export function CtaLink({
  href,
  children,
  tone = 'solid',
  size = 'md',
  icon,
  className,
}: CtaLinkProps) {
  const Icon = icon ? ICONS[icon] : null;

  return (
    <a
      href={href}
      className={cn(
        'ease-brand inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors active:translate-y-px',
        TONES[tone],
        tone === 'text' ? 'text-body min-h-11' : SIZES[size],
        className,
      )}
    >
      {children}
      {Icon ? <Icon aria-hidden size="1.1em" /> : null}
    </a>
  );
}
