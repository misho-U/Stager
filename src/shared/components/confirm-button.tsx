'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { Button } from '@/shared/components/button';
import { CONTENT_ID } from '@/shared/components/skip-link';

type ConfirmButtonProps = {
  /** What deleting also does ("3 articles will lose their category"), shown with Confirm. */
  warning?: string | null;
  label: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
};

type Step = 'delete' | 'confirm';

/**
 * Two-step destructive action.
 *
 * An inline confirm rather than a modal: it keeps the user where they already
 * are and needs no portal or focus trap. The point is only to make a delete
 * impossible to trigger by one mis-aimed click.
 *
 * Focus follows the buttons as they swap, since a button that disappears
 * drops the keyboard back to the top of the page: Delete hands it to Confirm,
 * Cancel hands it back to Delete, and when the delete goes through and this
 * row is gone, it moves to the page's content.
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
  const wrapper = useRef<HTMLSpanElement>(null);
  const focusNext = useRef<Step | null>(null);
  // Focus was here when Confirm was pressed. Kept apart, because a button
  // disabled while it works loses focus to the page.
  const confirmedHere = useRef(false);

  const hasFocus = () => wrapper.current?.contains(document.activeElement) ?? false;
  const focusStep = (step: Step) =>
    wrapper.current?.querySelector<HTMLElement>(`[data-step="${step}"]`)?.focus();

  const swap = (next: boolean) => {
    // Only when the keyboard is on this control already: a pointer that
    // never focused it is not pulled along.
    if (hasFocus()) focusNext.current = next ? 'confirm' : 'delete';
    confirmedHere.current = false;
    setArmed(next);
  };

  const confirm = () => {
    confirmedHere.current = hasFocus();
    void onConfirm();
  };

  useEffect(() => {
    const step = focusNext.current;
    focusNext.current = null;
    if (step) focusStep(step);
  }, [armed]);

  // Done working and still here (the delete failed, or the list has not
  // caught up yet): focus goes back to Confirm, where it can be seen again.
  useEffect(() => {
    if (loading || !armed || !confirmedHere.current) return;
    confirmedHere.current = false;
    focusStep('confirm');
  }, [loading, armed]);

  // Runs before React removes the row, while focus can still be seen here.
  useLayoutEffect(() => {
    const element = wrapper.current;
    return () => {
      if (!confirmedHere.current && !element?.contains(document.activeElement)) return;
      window.setTimeout(() => document.getElementById(CONTENT_ID)?.focus({ preventScroll: true }));
    };
  }, []);

  return (
    <span
      ref={wrapper}
      className={armed ? 'inline-flex flex-wrap items-center justify-end gap-1.5' : 'contents'}
    >
      {armed ? (
        <>
          {warning ? (
            <span role="note" className="text-caption text-danger basis-full text-right">
              {warning}
            </span>
          ) : null}
          <Button
            variant="danger"
            size="sm"
            data-step="confirm"
            loading={loading}
            onClick={confirm}
          >
            {confirmLabel}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => swap(false)} disabled={loading}>
            {t('cancel')}
          </Button>
        </>
      ) : (
        <Button variant="danger" size="sm" data-step="delete" onClick={() => swap(true)}>
          {label}
        </Button>
      )}
    </span>
  );
}
