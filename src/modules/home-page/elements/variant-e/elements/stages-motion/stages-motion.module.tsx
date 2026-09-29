'use client';

import { useRef, type ReactNode } from 'react';

import { useStagesMotion } from '@/modules/home-page/elements/variant-e/elements/stages-motion/stages-motion.service';
import { STAGES_MOTION } from '@/modules/home-page/elements/variant-e/variant-e.constants';
import { SmoothScroll } from '@/widgets/smooth-scroll/smooth-scroll.module';

/**
 * Stages' client side: runs the film over the server-rendered page and turns
 * on smooth scrolling. Adds only the wrapper that scopes it.
 */
export function StagesMotion({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  useStagesMotion(scope);

  return (
    <div ref={scope}>
      <SmoothScroll lerp={STAGES_MOTION.scrollLerp} />
      {children}
    </div>
  );
}
