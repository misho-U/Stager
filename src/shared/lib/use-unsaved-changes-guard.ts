'use client';

import { useEffect } from 'react';

/**
 * Asks before leaving a form with unsaved changes: closing or reloading the
 * tab (the browser's own prompt), or following a link inside the dashboard
 * (a confirm, worded by the caller). Saving navigates in code, not by a link,
 * so the redirect after a save is never stopped.
 */
export function useUnsavedChangesGuard(isDirty: boolean, message: string) {
  useEffect(() => {
    if (!isDirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Still required by some browsers to show the prompt at all.
      event.returnValue = '';
    };

    // Capture phase: runs before Next's Link handler, which then sees the
    // event stopped and does not navigate.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      // A new tab or window keeps this one, and the form with it.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest('a[href]');
      if (!link || link.getAttribute('target') === '_blank') return;
      if (link.getAttribute('href')?.startsWith('#')) return;

      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [isDirty, message]);
}
