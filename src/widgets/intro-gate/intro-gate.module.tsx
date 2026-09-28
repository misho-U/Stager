import { introStorageKey } from '@/widgets/intro-gate/intro-gate.constants';

/**
 * Keeps an intro to once per visit: rendered just before the intro's
 * `[data-intro="<id>"]` element, it hides that element before the first paint
 * when the intro has already played in this tab.
 *
 * It has to be an inline script. React hydrates too late to stop a flash of
 * the intro's first frame on every later page load, and the check needs
 * sessionStorage, which CSS cannot read. It only adds a <style> to <head>,
 * which React leaves alone during hydration. The public CSP allows inline
 * scripts (pkg/security/csp.ts).
 *
 * The rest of the intro's safety net is CSS, in globals.css: no intro under
 * reduced motion or without scripts, and a fallback that clears one if its
 * design's script never takes over.
 */
export function IntroGateScript({ id }: { id: string }) {
  const selector = `[data-intro="${id}"]`;
  const code =
    `try{if(sessionStorage.getItem(${JSON.stringify(introStorageKey(id))})){` +
    `var s=document.createElement('style');` +
    `s.textContent=${JSON.stringify(`${selector}{display:none!important}`)};` +
    `document.head.appendChild(s)}}catch(e){}`;

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
