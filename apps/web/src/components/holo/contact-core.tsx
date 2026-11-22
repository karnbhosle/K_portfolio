'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { dockedCore } from '@/components/reactor/core-journey';
import { Hologram } from './hologram';

const MAX = 21 * 16;
const MIN = 15 * 16;

/**
 * The arc-core hologram beside the contact headline. It sits midway between the background
 * reactor's outer ring and the right edge of the page, centred on the "I'll ship" line, and hides
 * wherever that gap is too narrow or would run into the headline.
 */
export function ContactCore() {
  const box = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<CSSProperties | null>(null);

  useEffect(() => {
    const header = box.current?.parentElement;
    const title = header?.querySelector<HTMLElement>('#contact-title');
    const punch = title?.querySelector<HTMLElement>('.text-cyan');
    if (!header || !title || !punch) return;

    const measure = () => {
      const vw = window.innerWidth;
      const pageRight = document.documentElement.clientWidth;
      if (vw < 1024) { setPlace(null); return; }
      const core = dockedCore(vw, window.innerHeight);
      const gapLeft = core.x + core.ring;
      const centreX = (gapLeft + pageRight) / 2;
      const size = Math.min(MAX, pageRight - gapLeft - 24);
      const frame = header.getBoundingClientRect();
      // The first line box of the cyan span is the line that starts "I'll ship".
      const line = punch.getClientRects()[0];
      const range = document.createRange();
      range.selectNodeContents(title);
      const textRight = Math.max(...Array.from(range.getClientRects(), (rect) => rect.right));
      if (!line || size < MIN || centreX - size / 2 < textRight + 12) { setPlace(null); return; }
      setPlace({
        left: centreX - size / 2 - frame.left,
        top: line.top + line.height / 2 - size / 2 - frame.top,
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
