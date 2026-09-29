'use client';

import { useRef, type ReactNode } from 'react';

import { useBlueprintMotion } from '@/modules/home-page/elements/variant-b/elements/blueprint-motion/blueprint-motion.service';
import { Crosshair } from '@/modules/home-page/elements/variant-b/elements/crosshair/crosshair.module';
import { BLUEPRINT_MOTION } from '@/modules/home-page/elements/variant-b/variant-b.constants';
import { SmoothScroll } from '@/widgets/smooth-scroll/smooth-scroll.module';

/**
 * Blueprint's client side: runs the drawing over the server-rendered page,
 * turns on smooth scrolling and mounts the crosshair. Adds only the wrapper
 * that scopes the motion and the crosshair's decorative overlay.
 */
export function BlueprintMotion({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  const crosshair = useRef<HTMLDivElement>(null);
  useBlueprintMotion(scope, crosshair);

  return (
    <div ref={scope}>
      <SmoothScroll lerp={BLUEPRINT_MOTION.scrollLerp} />
      {children}
      <div ref={crosshair}>
        <Crosshair />
      </div>
    </div>
  );
}
