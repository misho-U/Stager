import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

/**
 * GSAP for the public site's motion. Import it from here, never from 'gsap'
 * directly, so the core plugins are registered exactly once.
 *
 * Registration happens inside effects, not at module load: client components
 * are also evaluated on the server during rendering, where there is no window
 * for ScrollTrigger to attach to.
 *
 * Only the plugins every design uses live here. A design that needs a heavier
 * one (Draggable, Inertia, DrawSVG, ScrambleText) registers it in its own
 * service file, so no other design downloads it.
 */
let registered = false;

export function registerMotion(): void {
  if (registered || typeof window === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger, SplitText);
  // A phone's address bar showing and hiding resizes the viewport on every
  // scroll direction change; re-measuring every pinned scene then makes the
  // page jump. Width changes still refresh.
  ScrollTrigger.config({ ignoreMobileResize: true });
  registered = true;
}

export { gsap, ScrollTrigger, SplitText };
