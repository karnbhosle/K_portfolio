'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { dockedCore } from '@/components/reactor/core-journey';
import { Hologram } from './hologram';

const MAX = 21 * 16;
const MIN = 15 * 16;

/**
 * The arc-core hologram beside the contact headline. It sits midway between the background
 * reactor's outer ring and the right edge of the page, centred vertically on the whole headline,
 * and hides wherever that gap is too narrow or would run into the headline.
 */
export function ContactCore() {
  const box = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<CSSProperties | null>(null);

  useEffect(() => {
    const header = box.current?.parentElement;
    const title = header?.querySelector<HTMLElement>('#contact-title');
    if (!header || !title) return;

    const measure = () => {
      const vw = window.innerWidth;
      const pageRight = document.documentElement.clientWidth;
      if (vw < 1024) { setPlace(null); return; }
      const core = dockedCore(vw, window.innerHeight);
      const gapLeft = core.x + core.ring;
      const centreX = (gapLeft + pageRight) / 2;
      const size = Math.min(MAX, pageRight - gapLeft - 24);
      const frame = header.getBoundingClientRect();
      // Measure the words themselves, not element boxes: a block span spans the full width.
      let textRight = 0;
      let textTop = Infinity;
      let textBottom = -Infinity;
      const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent?.trim() || node.parentElement?.closest('.sr-only')) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of Array.from(range.getClientRects())) {
          textRight = Math.max(textRight, rect.right);
          textTop = Math.min(textTop, rect.top);
          textBottom = Math.max(textBottom, rect.bottom);
        }
      }
      if (!Number.isFinite(textTop) || size < MIN || centreX - size / 2 < textRight + 12) { setPlace(null); return; }
      setPlace({
        left: centreX - size / 2 - frame.left,
        top: (textTop + textBottom) / 2 - size / 2 - frame.top,
        width: size,
        height: size,
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    window.addEventListener('resize', measure);
    void document.fonts?.ready.then(measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  return (
    <div ref={box} className="pointer-events-none absolute z-10" style={place ?? { display: 'none' }}>
      {place ? (
        <Hologram
          scene="core"
          code="Holo.02 · Arc core"
          title="KARNA / CORE"
          label="The KARNA CORE arc reactor as a 3D wireframe: an icosahedral core inside three orbits and a ring of coils."
          className="pointer-events-auto h-full w-full"
        />
      ) : null}
    </div>
  );
}
