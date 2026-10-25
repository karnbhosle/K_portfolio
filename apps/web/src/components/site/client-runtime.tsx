'use client';

import { useEffect } from 'react';
import { followSystemMotion } from '@/lib/preferences';

/**
 * Page-wide behaviour with no UI of its own:
 * - pauses decorative loops while the tab is hidden
 * - follows OS reduced-motion changes
 * - reveals [data-reveal] blocks as they scroll in. Blocks already on screen are marked first,
 *   so nothing visible ever blinks out, and without JavaScript nothing is hidden at all.
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

    const blocks = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const reveal = (element: Element) => { (element as HTMLElement).dataset.revealed = ''; };
    let observer: IntersectionObserver | undefined;
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
    } else {
      blocks.forEach(reveal);
    }

    return () => {
      document.removeEventListener('visibilitychange', syncVisibility);
      media.removeEventListener('change', onMotionChange);
      observer?.disconnect();
    };
  }, []);

  return null;
}
