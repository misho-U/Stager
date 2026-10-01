'use client';

import { useRef, type ReactNode } from 'react';

import { useOpenKitchenMotion } from '@/modules/home-page/elements/open-kitchen/elements/open-kitchen-motion/open-kitchen-motion.service';

/** Option 1's motion, wrapped around its server-rendered page. */
export function OpenKitchenMotion({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  useOpenKitchenMotion(scope);
  return <div ref={scope}>{children}</div>;
}
