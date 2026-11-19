'use client';

import { useEffect, useRef } from 'react';
import { getMotion } from '@/lib/preferences';

const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/';

/**
 * Text that decodes itself, HUD style, the first time it scrolls into view and again on hover.
 * The real text is always in the DOM for assistive technology and no-JS visitors; only the
 * visible copy (aria-hidden) is scrambled.
 */
export function ScrambleText({ text, className = '' }: { text: string; className?: string }) {
  const visible = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);

  useEffect(() => {
    const element = visible.current;
    if (!element) return;

    const decode = () => {
      if (getMotion() !== 'on') return;
      window.cancelAnimationFrame(frame.current);
      const started = performance.now();
      const duration = 380 + text.length * 45;
      const tick = (now: number) => {
        const t = Math.min(1, (now - started) / duration);
        const settled = Math.floor(t * text.length);
        element.textContent = Array.from(text, (char, index) =>
          index < settled || char === ' ' ? char : glyphs[Math.floor(Math.random() * glyphs.length)]).join('');
        if (t < 1) frame.current = window.requestAnimationFrame(tick);
        else element.textContent = text;
      };
      frame.current = window.requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        decode();
        observer.disconnect();
      }
    }, { threshold: 0.6 });
    observer.observe(element);
    const host = element.parentElement;
    host?.addEventListener('pointerenter', decode);
    return () => {
      observer.disconnect();
      host?.removeEventListener('pointerenter', decode);
      window.cancelAnimationFrame(frame.current);
    };
  }, [text]);

  return (
    <>
      <span className="sr-only">{text}</span>
      <span ref={visible} aria-hidden="true" className={className}>{text}</span>
    </>
  );
}
