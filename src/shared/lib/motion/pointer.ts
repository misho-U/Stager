import { gsap } from '@/shared/lib/motion/gsap';

/**
 * Pointer-driven motion. Every value goes through `gsap.quickTo`, which moves
 * an existing tween instead of creating one per mouse event, and never through
 * React state: a re-render per pointer move collapses on a phone.
 *
 * Callers wire these up only under the `finePointer` condition (a mouse or a
 * trackpad); a touch screen has no pointer to follow.
 */

type Listener = () => void;

/** Moves `element` (fixed, top-left at 0,0) to wherever the pointer is. */
export function followPointer(
  element: HTMLElement,
  { duration = 0.35, ease = 'power3.out' }: { duration?: number; ease?: string } = {},
): Listener {
  const toX = gsap.quickTo(element, 'x', { duration, ease });
  const toY = gsap.quickTo(element, 'y', { duration, ease });
  const onMove = (event: PointerEvent) => {
    toX(event.clientX);
    toY(event.clientY);
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  return () => window.removeEventListener('pointermove', onMove);
}

/**
 * Pulls `element` a fraction of the way toward the pointer while it is over
 * it, and lets it spring back when the pointer leaves. The element's own
 * layout box never moves, so neighbours do not shift and the click target
 * stays where it was drawn.
 */
export function magnetic(element: HTMLElement, strength = 0.35): Listener {
  const toX = gsap.quickTo(element, 'x', { duration: 0.4, ease: 'power3.out' });
  const toY = gsap.quickTo(element, 'y', { duration: 0.4, ease: 'power3.out' });
  const onMove = (event: PointerEvent) => {
    const box = element.getBoundingClientRect();
    toX((event.clientX - (box.left + box.width / 2)) * strength);
    toY((event.clientY - (box.top + box.height / 2)) * strength);
  };
  const onLeave = () => {
    gsap.to(element, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' });
  };
  element.addEventListener('pointermove', onMove);
  element.addEventListener('pointerleave', onLeave);
  return () => {
    element.removeEventListener('pointermove', onMove);
    element.removeEventListener('pointerleave', onLeave);
  };
}
