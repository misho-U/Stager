'use client';

import { useState } from 'react';

import { Button } from '@/shared/components/button';

type ConfirmButtonProps = {
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
export function ConfirmButton({ label, confirmLabel, onConfirm, loading }: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <Button variant="danger" size="sm" onClick={() => setArmed(true)}>
        {label}
      </Button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <Button variant="danger" size="sm" loading={loading} onClick={() => void onConfirm()}>
        {confirmLabel}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setArmed(false)} disabled={loading}>
        Cancel
      </Button>
    </span>
  );
}
