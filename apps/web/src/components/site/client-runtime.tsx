'use client';

import { useEffect } from 'react';
import { followSystemMotion, getMotion } from '@/lib/preferences';

/**
 * Page-wide behaviour with no UI of its own:
 * - pauses decorative loops while the tab is hidden, and runs [data-loop] blocks only while on screen
 * - follows OS reduced-motion changes
 * - reveals [data-reveal] blocks as they scroll in. Blocks already on screen are marked first,
 *   so nothing visible ever blinks out, and without JavaScript nothing is hidden at all.
 * - marks the page as scrolled for the top bar
 * - feeds pointer position to .spot surfaces and the [data-tilt] hero reactor (fine pointers only)
 */
export function ClientRuntime() {
  useEffect(() => {
    const root = document.documentElement;
    const syncVisibility = () => { root.dataset.pageVisible = document.hidden ? 'false' : 'true'; };
    syncVisibility();
    document.addEventListener('visibilitychange', syncVisibility);

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotionChange = () => followSystemMotion(media.matches);
    media.addEventListener('change', onMotionChange);

    // Reveals
    const blocks = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const reveal = (element: Element) => { (element as HTMLElement).dataset.revealed = ''; };
    let observer: IntersectionObserver | undefined;
    let loopObserver: IntersectionObserver | undefined;
    let mutations: MutationObserver | undefined;
    if ('IntersectionObserver' in window) {
      const bottom = window.innerHeight;
      for (const block of blocks) {
        const box = block.getBoundingClientRect();
        if (box.top < bottom && box.bottom > 0) reveal(block);
      }
      root.dataset.revealReady = '';
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          reveal(entry.target);
          observer?.unobserve(entry.target);
        }
      }, { rootMargin: '0px 0px -8% 0px' });
      for (const block of blocks) if (!('revealed' in block.dataset)) observer.observe(block);

      // Loops (packets on wires, progress stripes) only run while their block is visible.
      loopObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          const element = entry.target as HTMLElement;
          if (entry.isIntersecting) element.dataset.inview = '';
          else delete element.dataset.inview;
        }
      });
      document.querySelectorAll('[data-loop]').forEach((element) => loopObserver?.observe(element));

      // Client components can remount (a key change, a hot reload): pick up any new blocks so
      // nothing stays hidden waiting for an observer that is watching a detached element.
      mutations = new MutationObserver((records) => {
        for (const record of records) {
          record.addedNodes.forEach((node) => {
            if (!(node instanceof HTMLElement)) return;
            const added = [node, ...node.querySelectorAll<HTMLElement>('[data-reveal], [data-loop]')];
            for (const element of added) {
              if (element.matches('[data-reveal]') && !('revealed' in element.dataset)) observer?.observe(element);
              if (element.matches('[data-loop]')) loopObserver?.observe(element);
            }
          });
        }
      });
      mutations.observe(document.body, { childList: true, subtree: true });
    } else {
      blocks.forEach(reveal);
    }

    // Scrolled state, coalesced to one write per frame.
    let scrollFrame = 0;
    let lastSweep = 0;
    const onScroll = () => {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        // Failsafe: anything already scrolled to or past is revealed, even if an observer missed it
        // (a very fast scroll, a remounted element). Content must never stay hidden.
        const now = performance.now();
        if (now - lastSweep > 200) {
          lastSweep = now;
          const bottom = window.innerHeight * 0.98;
          document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])').forEach((element) => {
            if (element.getBoundingClientRect().top < bottom) reveal(element);
          });
        }
        if (window.scrollY > 12) root.dataset.scrolled = '';
        else delete root.dataset.scrolled;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Pointer effects
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const tilt = document.querySelector<HTMLElement>('[data-tilt]');
    let pointerFrame = 0;
    let last: PointerEvent | null = null;
    let tilted: HTMLElement | null = null;
    const untilt = (element: HTMLElement | null) => {
      element?.style.setProperty('--rx', '0deg');
      element?.style.setProperty('--ry', '0deg');
    };
    const applyPointer = () => {
      pointerFrame = 0;
      const event = last;
      if (!event) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('.spot') : null;
      if (target) {
        const box = target.getBoundingClientRect();
        target.style.setProperty('--mx', `${event.clientX - box.left}px`);
        target.style.setProperty('--my', `${event.clientY - box.top}px`);
      }
      // Cards marked [data-tilt-card] lean toward the pointer, up to ~7 degrees.
      const card = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-tilt-card]') : null;
      if (card !== tilted) { untilt(tilted); tilted = card; }
      if (card && getMotion() === 'on') {
        const box = card.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width - 0.5;
        const y = (event.clientY - box.top) / box.height - 0.5;
        // Large cards ([data-tilt-card="soft"]) lean less, so reading them stays comfortable.
        const strength = card.dataset.tiltCard === 'soft' ? 0.3 : 1;
        card.style.setProperty('--rx', `${(-y * 10 * strength).toFixed(2)}deg`);
        card.style.setProperty('--ry', `${(x * 12 * strength).toFixed(2)}deg`);
      }
      if (tilt && getMotion() === 'on' && window.scrollY < window.innerHeight) {
        const x = (event.clientX / window.innerWidth) * 2 - 1;
        const y = (event.clientY / window.innerHeight) * 2 - 1;
        tilt.style.setProperty('--tx', x.toFixed(3));
        tilt.style.setProperty('--ty', y.toFixed(3));
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (!finePointer.matches || event.pointerType !== 'mouse') return;
      last = event;
      if (!pointerFrame) pointerFrame = window.requestAnimationFrame(applyPointer);
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    return () => {
      document.removeEventListener('visibilitychange', syncVisibility);
      media.removeEventListener('change', onMotionChange);
      observer?.disconnect();
      loopObserver?.disconnect();
      mutations?.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
      window.cancelAnimationFrame(scrollFrame);
      window.cancelAnimationFrame(pointerFrame);
    };
  }, []);

  return null;
}
