'use client';

import { useRef, type ReactNode } from 'react';

import { CARTE_MOTION } from '@/modules/home-page/elements/variant-a/variant-a.constants';
import { useCarteMotion } from '@/modules/home-page/elements/variant-a/elements/carte-motion/carte-motion.service';
import { SmoothScroll } from '@/widgets/smooth-scroll/smooth-scroll.module';

/**
 * Carte's one client component: it wraps the server-rendered page, runs its
 * motion over it and turns on the slow Lenis glide. It adds no markup of its
 * own beyond the wrapper that scopes the motion.
 */
export function CarteMotion({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  useCarteMotion(scope);

  return (
    <div ref={scope}>
      <SmoothScroll lerp={CARTE_MOTION.scrollLerp} />
      {children}
    </div>
  );
}
