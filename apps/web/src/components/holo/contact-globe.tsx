'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Hologram } from './hologram';

const SIZE = 18 * 16;

/**
 * The uplink globe under the contact details. Its title stays in the column's flow, and the globe
 * itself is placed so its centre lines up with that title ("Mumbai → anywhere") across, and with
 * the form's privacy note ("Your details are only used…") down. Wide screens only.
 */
export function ContactGlobe() {
  const title = useRef<HTMLSpanElement>(null);
  const [place, setPlace] = useState<CSSProperties | null>(null);

  useEffect(() => {
    const titleEl = title.current;
    const column = titleEl?.closest<HTMLElement>('.relative');
    const grid = column?.parentElement;
    const note = grid?.querySelector<HTMLElement>('[data-form-note]');
    if (!titleEl || !column || !grid || !note) return;

    const measure = () => {
      if (window.innerWidth < 1024) { setPlace(null); return; }
      const frame = column.getBoundingClientRect();
      const across = titleEl.getBoundingClientRect();
      const down = note.getBoundingClientRect();
      const centreX = across.left + across.width / 2;
      // Narrower screens: shrink just enough that the orbit never runs off the left edge.
      const size = Math.min(SIZE, 2 * (centreX - 4));
      setPlace({
        left: centreX - size / 2 - frame.left,
        top: down.top + down.height / 2 - size / 2 - frame.top,
        width: size,
        height: size,
      });
    };

    measure();
    // The form grows when it shows errors or a sent message, which moves the note.
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    window.addEventListener('resize', measure);
    // Both columns slide in when revealed; measure again once they have landed.
    grid.addEventListener('transitionend', measure);
    grid.addEventListener('animationend', measure);
    void document.fonts?.ready.then(measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      grid.removeEventListener('transitionend', measure);
      grid.removeEventListener('animationend', measure);
    };
  }, []);

  return (
    <>
      <p className="mt-8 hidden font-mono text-[0.625rem] uppercase tracking-[0.16em] lg:block" aria-hidden="true">
        <span className="block text-cyan/80">Holo.03 · Uplink</span>
        <span ref={title} className="mt-0.5 block w-max text-ink">Mumbai → anywhere</span>
      </p>
      {place ? (
        <div className="absolute z-10" style={place}>
          <Hologram
            scene="globe"
            caption={false}
            code="Holo.03 · Uplink"
            title="Mumbai → anywhere"
            label="Mumbai to anywhere: a 3D wireframe world map with a gold pin on Mumbai and signals arcing out to London, San Francisco, Singapore, Berlin, Dubai and Sydney."
            className="h-full w-full"
          />
        </div>
      ) : null}
    </>
  );
}
