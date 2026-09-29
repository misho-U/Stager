'use client';

import type { RefObject } from 'react';

import {
  FILM_MIN_FRAMES,
  STAGES_INTRO_ID,
  STAGES_MOTION as M,
} from '@/modules/home-page/elements/variant-e/variant-e.constants';
import { gsap, ScrollTrigger, SplitText } from '@/shared/lib/motion/gsap';
import { loosenMasks, splitReveal } from '@/shared/lib/motion/split';
import { useMotion } from '@/shared/lib/motion/use-motion';
import {
  hasPlayedIntro,
  markIntroPlayed,
  skipOnInput,
} from '@/widgets/intro-gate/intro-gate.service';

type Cleanup = () => void;

/**
 * The curtain, on the first visit in a tab: STAGER's letters rise while the
 * word gains weight, a line is drawn under it, and the curtain lifts off the
 * stage. Any key or click finishes it at once. Resolves the time, in
 * seconds, at which the stage is uncovered, so the headline can start then.
 */
function raiseCurtain(root: HTMLElement, cleanups: Cleanup[]): number {
  const curtain = root.querySelector<HTMLElement>('[data-intro]');
  if (!curtain) return 0;
  if (hasPlayedIntro(STAGES_INTRO_ID) || getComputedStyle(curtain).display === 'none') {
    gsap.set(curtain, { display: 'none' });
    return 0;
  }

  const word = curtain.querySelector<HTMLElement>('[data-curtain-word]');
  const line = curtain.querySelector<HTMLElement>('[data-curtain-line]');
  // Held hidden by CSS until now (`data-enter`), so the word is first seen rising.
  gsap.set([word, line], { opacity: 1 });
  const letters = word ? SplitText.create(word, { type: 'chars', mask: 'chars' }) : null;
  if (letters) loosenMasks(letters);
  const show = gsap.timeline({
    onComplete: () => {
      markIntroPlayed(STAGES_INTRO_ID);
      gsap.set(curtain, { display: 'none' });
    },
  });
  if (letters && word) {
    show
      .from(letters.chars, {
        yPercent: 110,
        duration: M.curtain.letters,
        ease: 'expo.out',
        stagger: M.curtain.letterStep,
      })
      .fromTo(
        word,
        { fontWeight: 200 },
        { fontWeight: 800, duration: M.curtain.letters + 0.4, ease: 'power2.inOut' },
        0,
      );
  }
  if (line) show.from(line, { scaleX: 0, duration: M.curtain.line, ease: 'expo.inOut' }, 0.5);
  show.to(
    curtain,
    { yPercent: -100, duration: M.curtain.lift, ease: M.curtain.liftEase },
    '+=0.25',
  );

  cleanups.push(skipOnInput(() => show.progress(1)));
  cleanups.push(() => {
    show.kill();
    letters?.revert();
  });
  // The stage is uncovered halfway through the lift.
  return show.duration() - M.curtain.lift / 2;
}

/**
 * Keeps the fixed header readable: it takes the tone (light or dark) of
 * whichever scene is just beneath it. Checked a few times a second rather
 * than on scroll events, because a pinned scene keeps changing under the
 * header after the scrolling itself has stopped (scrub and snap catch up).
 */
function followSceneTone(root: HTMLElement): Cleanup {
  const header = root.querySelector<HTMLElement>('[data-stages-header]');
  if (!header) return () => {};
  let last = 0;
  const check = () => {
    const now = performance.now();
    if (now - last < 120) return;
    last = now;
    const probe = document.elementFromPoint(
      window.innerWidth / 2,
      header.getBoundingClientRect().bottom + 2,
    );
    const tone = probe?.closest<HTMLElement>('[data-tone]')?.dataset.tone ?? 'light';
    if (header.dataset.tone !== tone) header.dataset.tone = tone;
  };
  gsap.ticker.add(check);
  return () => gsap.ticker.remove(check);
}

/**
 * The stages: pinned to the screen, each scene wipes up over the last as the
 * page scrolls, its title rising letter by letter as it comes, settling on
 * each scene like a cut.
 */
function runStages(section: HTMLElement): Cleanup {
  const frame = section.querySelector<HTMLElement>('[data-stages-frame]');
  const layers = [...section.querySelectorAll<HTMLElement>('[data-stage-layer]')];
  if (!frame || layers.length < 2) return () => {};

  section.setAttribute('data-stages-on', '');
  const splits = layers.map((layer) => {
    const title = layer.querySelector<HTMLElement>('[data-stage-title]');
    if (!title) return null;
    const split = SplitText.create(title, { type: 'lines,chars', mask: 'lines', aria: 'auto' });
    loosenMasks(split);
    return split;
  });

  gsap.set(layers.slice(1), { clipPath: 'inset(100% 0% 0% 0%)' });
  const film = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: frame,
      pin: true,
      start: 'top top',
      end: () => `+=${window.innerHeight * M.stageStep * (layers.length - 1)}`,
      scrub: 0.6,
      snap: { snapTo: 1 / (layers.length - 1), duration: 0.5, ease: 'power2.inOut' },
      invalidateOnRefresh: true,
    },
  });
  layers.slice(1).forEach((layer, index) => {
    const at = index;
    film.to(layer, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1 }, at);
    const chars = splits[index + 1]?.chars;
    if (chars?.length) {
      film.from(
        chars,
        { yPercent: 105, duration: 0.6, stagger: { amount: 0.3 }, ease: 'power3.out' },
        at + 0.35,
      );
    }
  });

  return () => {
    film.scrollTrigger?.kill();
    film.kill();
    for (const split of splits) split?.revert();
    gsap.set(layers, { clearProps: 'clipPath' });
    section.removeAttribute('data-stages-on');
  };
}

/**
 * The filmstrip: the projects section pins and its frames run sideways past
 * the viewer, the pictures drifting inside their frames and the frames
 * leaning into the speed of the scroll.
 */
function runFilm(section: HTMLElement): Cleanup {
  const pin = section.querySelector<HTMLElement>('[data-film-pin]');
  const track = section.querySelector<HTMLElement>('[data-film-track]');
  const frames = [...section.querySelectorAll<HTMLElement>('[data-film-frame]')];
  if (!pin || !track || frames.length < FILM_MIN_FRAMES) return () => {};

  section.setAttribute('data-film-on', '');
  const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
  const skewTo = frames.map((frame) =>
    gsap.quickTo(frame, 'skewX', { duration: 0.5, ease: 'power3.out' }),
  );
  // Scroll events stop when the scrolling does; this straightens the frames then.
  const straighten = gsap
    .delayedCall(0.14, () => {
      for (const skewFrame of skewTo) skewFrame(0);
    })
    .pause();
  const pan = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: pin,
      pin: true,
      start: 'top top',
      end: () => `+=${distance()}`,
      scrub: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const skew = gsap.utils.clamp(
          -M.skew.max,
          M.skew.max,
          self.getVelocity() / -M.skew.divisor,
        );
        for (const skewFrame of skewTo) skewFrame(skew);
        straighten.restart(true);
      },
    },
  });
  const drifts = frames.map((frame) => {
    const picture = frame.querySelector('[data-parallax]');
    return picture
      ? gsap.fromTo(
          picture,
          { xPercent: 6 },
          {
            xPercent: -6,
            ease: 'none',
            scrollTrigger: {
              trigger: frame,
              containerAnimation: pan,
              start: 'left right',
              end: 'right left',
              scrub: true,
            },
          },
        )
      : null;
  });

  return () => {
    for (const drift of drifts) {
      drift?.scrollTrigger?.kill();
      drift?.kill();
    }
    straighten.kill();
    pan.scrollTrigger?.kill();
    pan.kill();
    gsap.set([track, ...frames], { clearProps: 'transform' });
    section.removeAttribute('data-film-on');
  };
}

/** The cursor disc: over the stages it points down, over the filmstrip across. */
function setupCursor(root: HTMLElement): Cleanup {
  const disc = root.querySelector<HTMLElement>('[data-stage-cursor]');
  if (!disc) return () => {};
  gsap.set(disc, { display: 'flex', xPercent: -50, yPercent: -50, scale: 0 });
  const toX = gsap.quickTo(disc, 'x', { duration: 0.4, ease: 'power3.out' });
  const toY = gsap.quickTo(disc, 'y', { duration: 0.4, ease: 'power3.out' });
  const icon = disc.querySelector('svg');
  let shown = false;

  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    toX(event.clientX);
    toY(event.clientY);
    const target = event.target as Element | null;
    const pressable = target?.closest('a, button, input, select, textarea, label');
    const over = pressable ? null : target?.closest('[data-stages-on], [data-film-on]');
    const show = over !== null && over !== undefined;
    if (show !== shown) {
      shown = show;
      gsap.to(disc, { scale: show ? 1 : 0, duration: 0.35, ease: 'power3.out' });
    }
    if (show && over) {
      disc.dataset.tone = target?.closest<HTMLElement>('[data-tone]')?.dataset.tone ?? 'light';
      if (icon) gsap.set(icon, { rotation: over.hasAttribute('data-film-on') ? -90 : 0 });
    }
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  return () => window.removeEventListener('pointermove', onMove);
}

/**
 * Stages' motion: the curtain and the headline assembling, the header's
 * tone, the first scene receding as the intro slides over it, the intro read
 * along word by word, the pinned stages, the filmstrip, the credits, the
 * finale, and the cursor.
 */
export function useStagesMotion(scope: RefObject<HTMLElement | null>) {
  useMotion(scope, ({ motion, desktop, finePointer }, root) => {
    const cleanups: Cleanup[] = [followSceneTone(root)];
    if (!motion) {
      return () => {
        for (const cleanup of cleanups) cleanup();
      };
    }
    const all = (selector: string) => [...root.querySelectorAll<HTMLElement>(selector)];

    const stageUncovered = raiseCurtain(root, cleanups);

    // The headline assembles from letters scattered across the stage.
    const headline = root.querySelector<HTMLElement>('[data-assemble]');
    const heroSplit = headline
      ? splitReveal(headline, {
          type: 'lines,chars',
          animate: (self) =>
            gsap.from(self.chars, {
              x: () => gsap.utils.random(-M.assemble.spread, M.assemble.spread),
              y: () => gsap.utils.random(-M.assemble.spread, M.assemble.spread),
              rotation: () => gsap.utils.random(-50, 50),
              opacity: 0,
              duration: M.assemble.duration,
              ease: M.assemble.ease,
              stagger: { amount: 0.7, from: 'random' },
              delay: stageUncovered + 0.1,
            }),
        })
      : null;
    if (headline) gsap.set(headline, { opacity: 1 });
    gsap.from(
      all('[data-recede] > [data-enter]').filter((element) => element !== headline),
      {
        opacity: 0,
        y: 20,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.12,
        delay: stageUncovered + 0.9,
      },
    );
    gsap.from(all('[data-stages-header]'), {
      yPercent: -100,
      duration: 0.8,
      ease: 'power3.out',
      delay: stageUncovered,
    });
    gsap.fromTo(
      all('[data-cue]'),
      { yPercent: -100 },
      { yPercent: 300, duration: 1.6, ease: 'power2.inOut', repeat: -1 },
    );

    // The first scene recedes as the intro slides up over it.
    const recede = root.querySelector('[data-recede]');
    const intro = root.querySelector('#about');
    if (recede && intro) {
      gsap.to(recede, {
        scale: 0.86,
        opacity: 0.25,
        ease: 'none',
        scrollTrigger: { trigger: intro, start: 'top bottom', end: 'top top', scrub: true },
      });
    }

    // The intro, read along: each word lights up as the page reaches it.
    for (const body of all('[data-read-along]')) {
      const words = SplitText.create(body.querySelectorAll('p, li'), {
        type: 'words',
        aria: 'auto',
      });
      gsap.fromTo(
        words.words,
        { opacity: 0.16 },
        {
          opacity: 1,
          ease: 'none',
          stagger: 0.1,
          scrollTrigger: { trigger: body, start: 'top 78%', end: 'bottom 48%', scrub: true },
        },
      );
      cleanups.push(() => words.revert());
    }

    const reveals = all('[data-reveal]');
    gsap.set(reveals, { opacity: 0, y: 30 });
    ScrollTrigger.batch(reveals, {
      start: 'top 88%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.1 }),
    });

    // The credits: every paragraph sharpest as it crosses the middle of the screen.
    for (const credits of all('[data-credits]')) {
      for (const line of credits.querySelectorAll<HTMLElement>('.rich-text > *')) {
        gsap
          .timeline({
            scrollTrigger: { trigger: line, start: 'top bottom', end: 'bottom top', scrub: true },
          })
          .fromTo(line, { opacity: 0.15 }, { opacity: 1, duration: 0.45, ease: 'none' })
          .to(line, { opacity: 0.15, duration: 0.45, ease: 'none' }, 0.55);
      }
    }

    // The finale's heading rises letter by letter as the page arrives.
    const finale = root.querySelector<HTMLElement>('[data-finale]');
    const finaleSplit = finale
      ? SplitText.create(finale, { type: 'lines,chars', mask: 'lines', aria: 'auto' })
      : null;
    if (finaleSplit) loosenMasks(finaleSplit);
    if (finaleSplit) {
      gsap.from(finaleSplit.chars, {
        yPercent: 110,
        ease: 'none',
        stagger: { amount: 0.6 },
        scrollTrigger: { trigger: finale, start: 'top 90%', end: 'top 40%', scrub: 0.5 },
      });
    }

    if (desktop) {
      const stages = root.querySelector<HTMLElement>('[data-stages]');
      if (stages) cleanups.push(runStages(stages));
      const film = root.querySelector<HTMLElement>('[data-film]');
      if (film) cleanups.push(runFilm(film));
    }

    if (finePointer) cleanups.push(setupCursor(root));

    return () => {
      heroSplit?.revert();
      finaleSplit?.revert();
      for (const cleanup of cleanups) cleanup();
    };
  });
}
