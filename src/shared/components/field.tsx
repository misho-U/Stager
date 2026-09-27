'use client';

import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { useId } from 'react';

import { cn } from '@/shared/lib/cn';

const CONTROL_CLASS =
  'w-full rounded-md border border-line-input bg-surface-raised text-ink ' +
  'placeholder:text-ink-subtle focus:border-primary focus:outline-none ' +
  'disabled:cursor-not-allowed disabled:bg-surface-muted';

/**
 * md is the dashboard's size. lg is for public pages: 16px text, because iOS
 * zooms into any field set smaller when it takes focus, and a 44px target.
 */
type FieldSize = 'md' | 'lg';

const CONTROL_SIZES: Record<FieldSize, string> = {
  md: 'px-3 py-2 text-body-sm',
  lg: 'min-h-11 px-4 py-2.5 text-body',
};

const TEXT_SIZES: Record<FieldSize, string> = {
  md: 'text-caption',
  lg: 'text-body-sm',
};

type FieldShellProps = {
  label: string;
  htmlFor: string;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean;
  size: FieldSize;
  children: ReactNode;
};

/**
 * Label, control, hint and error in one place.
 *
 * The error is wired with aria-describedby and aria-invalid rather than just
 * rendered in red — a validation message nobody's screen reader announces is
 * not a validation message.
 */
function FieldShell({ label, htmlFor, error, hint, required, size, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className={cn(TEXT_SIZES[size], 'text-ink-muted font-medium')}>
        {label}
        {required ? <span className="text-danger ml-1">*</span> : null}
      </label>
      {children}
      {hint && !error ? <p className={cn(TEXT_SIZES[size], 'text-ink-subtle')}>{hint}</p> : null}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className={cn(TEXT_SIZES[size], 'text-danger')}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'size'> & {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  size?: FieldSize;
};

export function TextField({ label, error, hint, required, size = 'md', ...props }: TextFieldProps) {
  const id = useId();

  return (
    <FieldShell
      label={label}
      htmlFor={id}
      error={error}
      hint={hint}
      required={required}
      size={size}
    >
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(CONTROL_CLASS, CONTROL_SIZES[size], error && 'border-danger')}
        {...props}
      />
    </FieldShell>
  );
}

type TextAreaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  size?: FieldSize;
};

export function TextAreaField({
  label,
  error,
  hint,
  required,
  rows = 4,
  size = 'md',
  ...props
}: TextAreaFieldProps) {
  const id = useId();

  return (
    <FieldShell
      label={label}
      htmlFor={id}
      error={error}
      hint={hint}
      required={required}
      size={size}
    >
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(CONTROL_CLASS, CONTROL_SIZES[size], 'resize-y', error && 'border-danger')}
        {...props}
      />
    </FieldShell>
  );
}

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'size'> & {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  size?: FieldSize;
};

export function SelectField({
  label,
  error,
  hint,
  required,
  options,
  placeholder,
  size = 'md',
  ...props
}: SelectFieldProps) {
  const id = useId();

  return (
    <FieldShell
      label={label}
      htmlFor={id}
      error={error}
      hint={hint}
      required={required}
      size={size}
    >
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(CONTROL_CLASS, CONTROL_SIZES[size], error && 'border-danger')}
        {...props}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

type CheckboxFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> & {
  label: string;
  hint?: string;
};

export function CheckboxField({ label, hint, ...props }: CheckboxFieldProps) {
  const id = useId();

  return (
    <div className="flex items-start gap-2.5">
      <input
        id={id}
        type="checkbox"
        className="border-line-input accent-primary mt-0.5 size-4 rounded-sm"
        {...props}
      />
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="text-body-sm text-ink">
          {label}
        </label>
        {hint ? <p className="text-caption text-ink-subtle">{hint}</p> : null}
      </div>
    </div>
  );
}
