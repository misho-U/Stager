'use client';

import { useFormatter } from 'next-intl';
import { useEffect, useRef } from 'react';

/**
 * The time a ticket was "printed": now, in the visitor's language, kept
 * current while the page is open. Filled in only in the browser, since the
 * server's clock and time zone are not the visitor's; until then it is empty.
 */
export function LiveDate({ className }: { className?: string }) {
  const format = useFormatter();
  const element = useRef<HTMLTimeElement>(null);

  useEffect(() => {
    const print = () => {
      const now = new Date();
      if (!element.current) return;
      element.current.dateTime = now.toISOString();
      element.current.textContent = format.dateTime(now, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };
    print();
    const timer = window.setInterval(print, 30_000);
    return () => window.clearInterval(timer);
  }, [format]);

  return <time ref={element} className={className} suppressHydrationWarning />;
}
