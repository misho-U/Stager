'use client';

import { useRef, type ReactNode } from 'react';

import { useChefsTableMotion } from '@/modules/home-page/elements/chefs-table/elements/chefs-table-motion/chefs-table-motion.service';

/** Option 2's motion, wrapped around its server-rendered page. */
export function ChefsTableMotion({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  useChefsTableMotion(scope);
  return <div ref={scope}>{children}</div>;
}
