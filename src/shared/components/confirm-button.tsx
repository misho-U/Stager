'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/shared/components/button';

type ConfirmButtonProps = {
  /** What deleting also does ("3 articles will lose their category"), shown with Confirm. */
  warning?: string | null;
  label: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
};

/**
 * Two-step destructive action.
 *
 * An inline confirm rather than a modal: it keeps focus where the user already
 * is, needs no portal or focus trap, and reverts by itself when they click
 * away. The point is only to make a delete impossible to trigger by one
 * mis-aimed click.
 */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  loading,
  warning,
}: ConfirmButtonProps) {
  const t = useTranslations('admin.common');
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <Button variant="danger" size="sm" onClick={() => setArmed(true)}>
        {label}
      </Button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
      {warning ? (
        <span role="note" className="text-caption text-danger basis-full text-right">
          {warning}
        </span>
      ) : null}
      <Button variant="danger" size="sm" loading={loading} onClick={() => void onConfirm()}>
        {confirmLabel}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setArmed(false)} disabled={loading}>
        {t('cancel')}
      </Button>
    </span>
  );
}
