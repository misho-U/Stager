'use client';

import { useRef, type ReactNode } from 'react';

import { usePlateMotion } from '@/modules/home-page/elements/variant-c/elements/plate-motion/plate-motion.service';
import { PLATE_MOTION } from '@/modules/home-page/elements/variant-c/variant-c.constants';
import { SmoothScroll } from '@/widgets/smooth-scroll/smooth-scroll.module';

/**
 * Plate's client side: runs the table's motion over the server-rendered
 * page, turns on smooth scrolling, and adds the round cursor (hidden unless
 * there is a mouse and motion is allowed).
 */
export function PlateMotion({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  const cursor = useRef<HTMLDivElement>(null);
  usePlateMotion(scope, cursor);

  return (
    <div ref={scope}>
      <SmoothScroll lerp={PLATE_MOTION.scrollLerp} anchorOffset={0} />
      {children}
      <div
        ref={cursor}
        aria-hidden
        data-decorative
        data-plate-cursor
        className="pointer-events-none fixed top-0 left-0 z-(--z-cursor) hidden rounded-full"
      />
    </div>
  );
}
