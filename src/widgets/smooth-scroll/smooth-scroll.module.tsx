'use client';

import { useSmoothScroll } from '@/widgets/smooth-scroll/smooth-scroll.service';

/**
 * Turns on smooth scrolling for the page while mounted. Renders nothing.
 *
 * `lerp` is the design's feel: how much of the remaining distance each frame
 * covers. Smaller glides longer (0.06 is a slow, heavy page; 0.12 is brisk).
 */
export function SmoothScroll({ lerp, anchorOffset }: { lerp: number; anchorOffset?: number }) {
  useSmoothScroll({ lerp, anchorOffset });
  return null;
}
