'use client';

import { useRef, type ReactNode } from 'react';

import { useSiteMotion } from '@/widgets/site-motion/site-motion.service';

/**
 * The site's motion, wrapped around a server-rendered public page. Every
 * public page uses it, so the home page and the pages beside it move alike;
 * an effect whose elements a page does not have does nothing there.
 */
export function SiteMotion({ children, className }: { children: ReactNode; className?: string }) {
  const scope = useRef<HTMLDivElement>(null);
  useSiteMotion(scope);
  return (
    <div ref={scope} className={className}>
      {children}
    </div>
  );
}
