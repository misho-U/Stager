import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps } from 'react';

import { cn } from '@/shared/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover disabled:bg-primary-disabled',
  secondary: 'border border-line-strong bg-transparent text-ink hover:bg-surface-muted',
  ghost: 'bg-transparent text-ink-muted hover:bg-surface-muted hover:text-ink',
  danger: 'border border-danger/40 bg-transparent text-danger hover:bg-danger/10',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-body-sm',
  md: 'h-10 px-4 text-body-sm',
  /** Public pages: a 44px touch target and body-size text. */
  lg: 'min-h-11 px-6 text-body',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  /** Renders a busy state and blocks repeat submits. */
  loading?: boolean;
};

// One line always: the height is fixed, so a wrapped label (longer in
// Georgian) would spill out of the button.
const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors';

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      // Buttons default to type="submit" inside a form, which makes every
      // stray button a form submission. Default to "button" instead.
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        BASE,
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

/**
 * A link that looks like a button: for anything that goes somewhere (New,
 * Back, Cancel). Never a <Button> inside a <Link>: a button inside a link is
 * invalid, and a keyboard stops on it twice.
 */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonLinkProps) {
  return <Link className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props} />;
}
