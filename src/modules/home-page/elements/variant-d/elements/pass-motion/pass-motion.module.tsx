'use client';

import { useRef, type ReactNode } from 'react';

import { usePassMotion } from '@/modules/home-page/elements/variant-d/elements/pass-motion/pass-motion.service';
import { PASS_MOTION } from '@/modules/home-page/elements/variant-d/variant-d.constants';
import { SmoothScroll } from '@/widgets/smooth-scroll/smooth-scroll.module';

/**
 * Pass's client side: runs the pass's motion over the server-rendered page
 * and turns on smooth scrolling. Adds only the wrapper that scopes it.
 */
export function PassMotion({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  usePassMotion(scope);

  return (
    <div ref={scope}>
      <SmoothScroll lerp={PASS_MOTION.scrollLerp} />
      {children}
    </div>
  );
}
