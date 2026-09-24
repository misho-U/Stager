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
  'w-full rounded-md border border-line bg-surface-raised px-3 py-2 text-body-sm text-ink ' +
  'placeholder:text-ink-subtle focus:border-primary focus:outline-none ' +
  'disabled:cursor-not-allowed disabled:bg-surface-muted';

type FieldShellProps = {
  label: string;
  htmlFor: string;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean;
  children: ReactNode;
};

/**
 * Label, control, hint and error in one place.
 *
 * The error is wired with aria-describedby and aria-invalid rather than just
 * rendered in red — a validation message nobody's screen reader announces is
 * not a validation message.
 */
function FieldShell({ label, htmlFor, error, hint, required, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-caption font-medium text-ink-muted">
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="text-caption text-ink-subtle">{hint}</p> : null}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
};

export function TextField({ label, error, hint, required, ...props }: TextFieldProps) {
  const id = useId();

  return (
    <FieldShell label={label} htmlFor={id} error={error} hint={hint} required={required}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(CONTROL_CLASS, error && 'border-danger')}
        {...props}
      />
    </FieldShell>
  );
}

type TextAreaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
};

export function TextAreaField({
  label,
  error,
  hint,
  required,
  rows = 4,
  ...props
}: TextAreaFieldProps) {
  const id = useId();

  return (
    <FieldShell label={label} htmlFor={id} error={error} hint={hint} required={required}>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(CONTROL_CLASS, 'resize-y', error && 'border-danger')}
        {...props}
      />
    </FieldShell>
  );
}

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
};

export function SelectField({
  label,
  error,
  hint,
  required,
  options,
  placeholder,
  ...props
}: SelectFieldProps) {
  const id = useId();

  return (
    <FieldShell label={label} htmlFor={id} error={error} hint={hint} required={required}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(CONTROL_CLASS, error && 'border-danger')}
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
        className="mt-0.5 size-4 rounded-sm border-line accent-primary"
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
