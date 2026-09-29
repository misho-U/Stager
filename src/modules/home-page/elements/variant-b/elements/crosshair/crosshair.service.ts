'use client';

import { BLUEPRINT_MOTION as M } from '@/modules/home-page/elements/variant-b/variant-b.constants';
import { gsap } from '@/shared/lib/motion/gsap';

/** How far the selection box stands off whatever it snaps to, in px. */
const SNAP_MARGIN = 6;
/** Where the coordinate readout sits relative to the pointer, in px. */
const READOUT_OFFSET = 14;

const pad = (value: number) => String(Math.max(0, Math.round(value))).padStart(4, '0');

/**
 * The precision crosshair: a hairline across the whole screen on each axis,
 * following the pointer, a readout of where it is, and a selection box that
 * snaps round links, rooms and project sheets (`data-snap`) like a drawing
 * tool's. Mouse and trackpad only; the caller decides that.
 *
 * Returns the cleanup that removes its listeners.
 */
export function setupCrosshair(root: HTMLElement, overlay: HTMLElement): () => void {
  const lineX = overlay.querySelector<HTMLElement>('[data-cross-x]');
  const lineY = overlay.querySelector<HTMLElement>('[data-cross-y]');
  const box = overlay.querySelector<HTMLElement>('[data-cross-box]');
  const readout = overlay.querySelector<HTMLElement>('[data-cross-readout]');
  if (!lineX || !lineY || !box || !readout) return () => {};

  gsap.set(overlay, { display: 'block', opacity: 0 });
  root.classList.add('cursor-crosshair');

  const toY = gsap.quickTo(lineX, 'y', { duration: M.cross.duration, ease: M.cross.ease });
  const toX = gsap.quickTo(lineY, 'x', { duration: M.cross.duration, ease: M.cross.ease });
  const readX = gsap.quickTo(readout, 'x', { duration: M.cross.duration, ease: M.cross.ease });
  const readY = gsap.quickTo(readout, 'y', { duration: M.cross.duration, ease: M.cross.ease });

  let shown = false;
  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    if (!shown) {
      shown = true;
      gsap.to(overlay, { opacity: 1, duration: 0.3 });
    }
    toX(event.clientX);
    toY(event.clientY);
    readX(event.clientX + READOUT_OFFSET);
    readY(event.clientY + READOUT_OFFSET);
    readout.textContent = `X ${pad(event.clientX)}  Y ${pad(event.clientY + window.scrollY)}`;
  };

  let snapped: Element | null = null;
  const onOver = (event: PointerEvent) => {
    const target = (event.target as Element | null)?.closest('[data-snap]');
    if (!target || target === snapped || !root.contains(target)) return;
    snapped = target;
    const rect = target.getBoundingClientRect();
    gsap.to(box, {
      x: rect.left - SNAP_MARGIN,
      y: rect.top - SNAP_MARGIN,
      width: rect.width + SNAP_MARGIN * 2,
      height: rect.height + SNAP_MARGIN * 2,
      opacity: 1,
      duration: 0.35,
      ease: 'power3.out',
    });
  };
  const release = () => {
    snapped = null;
    gsap.to(box, { opacity: 0, duration: 0.2 });
  };
  const onOut = (event: PointerEvent) => {
    if (!snapped) return;
    const next = event.relatedTarget as Node | null;
    if (!next || !snapped.contains(next)) release();
  };
  const onLeaveWindow = () => {
    shown = false;
    gsap.to(overlay, { opacity: 0, duration: 0.3 });
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  root.addEventListener('pointerover', onOver);
  root.addEventListener('pointerout', onOut);
  // A box drawn round something that has since scrolled away would mislead.
  window.addEventListener('scroll', release, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeaveWindow);

  return () => {
    window.removeEventListener('pointermove', onMove);
    root.removeEventListener('pointerover', onOver);
    root.removeEventListener('pointerout', onOut);
    window.removeEventListener('scroll', release);
    document.documentElement.removeEventListener('pointerleave', onLeaveWindow);
    root.classList.remove('cursor-crosshair');
  };
}
