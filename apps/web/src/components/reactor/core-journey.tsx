'use client';

import { useEffect, useRef } from 'react';
import { getMotion } from '@/lib/preferences';
import { ArcReactor } from './arc-reactor';

/*
 * One reactor, one journey. It lives in a fixed layer behind the content:
 *   p 0.00–0.42  sits on the hero anchor, then collapses to a point as the visitor scrolls
 *   p 0.34–0.82  a sparkle flares where it collapsed and arcs to the centre of the screen
 *   p 0.74–0.90  the sparkle bursts and a full-size reactor powers up at the centre
 *   p 0.90–1.00  it settles into the background, where it stays pinned for the rest of the page
 * p is scroll progress from the top of the page to the About block. Scrolling back reverses it.
 * With motion off it simply sits on the hero, then in the background, with no travel.
 */

const SHRINK_END = 0.42;
const FLARE_START = 0.34;
const TRAVEL_END = 0.74;
const BURST_END = 0.82;
const GROW_END = 0.9;
const TRAIL = 6;

/**
 * Where the reactor rests once it has docked in the background: centred in the viewport.
 * `ring` is the radius of its outermost drawn ring (r 190 of the 200-unit artwork).
 */
export function dockedCore(vw: number, vh: number) {
  const size = Math.min(Math.min(vw, vh) * 0.92, 56 * 16) * 0.925;
  return { x: vw / 2, y: vh / 2 + 16, size, ring: (size / 2) * 0.95 };
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const range = (p: number, start: number, end: number) => clamp((p - start) / (end - start));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeIn = (t: number) => t ** 3;

export function CoreJourney() {
  const core = useRef<HTMLDivElement>(null);
  const sparkle = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const trail = useRef<Array<HTMLSpanElement | null>>([]);
  const reticle = useRef<SVGSVGElement>(null);
  const glow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anchor = document.querySelector<HTMLElement>('[data-core-anchor]');
    const dock = document.querySelector<HTMLElement>('[data-core-dock]');
    const hud = document.querySelector<HTMLElement>('[data-core-hud]');
    const coreEl = core.current;
    const sparkleEl = sparkle.current;
    const ringEl = ring.current;
    if (!anchor || !dock || !coreEl || !sparkleEl || !ringEl) return;

    let frame = 0;
    let size = 0; // rendered px size of the core element; it is only ever scaled down
    let end = 1;
    let backgroundSize = 0;
    let backgroundOpacity = 0.16;

    const layout = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      backgroundSize = dockedCore(vw, vh).size;
      backgroundOpacity = vw < 768 ? 0.12 : 0.16;
      size = Math.max(anchor.getBoundingClientRect().width, backgroundSize);
      coreEl.style.width = `${size}px`;
      coreEl.style.height = `${size}px`;
      const dockTop = dock.getBoundingClientRect().top + window.scrollY;
      end = Math.max(320, dockTop - vh * 0.15);
    };

    const anchorOpacity = () => {
      const value = Number.parseFloat(getComputedStyle(anchor).getPropertyValue('--core-opacity'));
      return Number.isFinite(value) ? value : 1;
    };

    const place = (element: HTMLElement, x: number, y: number, scale: number, opacity: number, rotate = 0) => {
      element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale}) rotate(${rotate}deg)`;
      element.style.opacity = String(opacity);
    };

    const render = () => {
      frame = 0;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const p = clamp(window.scrollY / end);
      const box = anchor.getBoundingClientRect();
      const anchorX = box.left + box.width / 2;
      const anchorY = box.top + box.height / 2;
      const heroScale = box.width / size;
      const centerX = vw / 2;
      const centerY = vh / 2 + 16;
      const startOpacity = anchorOpacity();
      coreEl.style.setProperty('--lean', String(clamp(1 - p * 3)));
      if (hud) hud.style.opacity = String(clamp(1 - p / 0.18));

      if (getMotion() === 'off') {
        const docked = p >= 0.5;
        place(coreEl, docked ? centerX : anchorX, docked ? centerY : anchorY, docked ? backgroundSize / size : heroScale, docked ? backgroundOpacity : startOpacity);
        sparkleEl.style.opacity = '0';
        ringEl.style.opacity = '0';
        trail.current.forEach((dot) => { if (dot) dot.style.opacity = '0'; });
        return;
      }

      // Where the core collapsed, in viewport coordinates at the moment it did.
      const launchX = anchorX;
      const launchY = anchorY + (window.scrollY - SHRINK_END * end);

      // The core: collapse on the hero, hidden in flight, powered up at the centre.
      if (p <= SHRINK_END) {
        const t = easeIn(range(p, 0, SHRINK_END));
        place(coreEl, anchorX, anchorY, lerp(heroScale, heroScale * 0.03, t), lerp(startOpacity, 1, Math.min(1, t * 1.4)), t * -90);
      } else if (p < TRAVEL_END) {
        place(coreEl, launchX, launchY, heroScale * 0.03, 0);
      } else {
        const grow = easeOut(range(p, TRAVEL_END, GROW_END));
        const settle = easeInOut(range(p, GROW_END, 1));
        const scale = (backgroundSize / size) * lerp(0.02, 1, grow) * lerp(1.06, 1, settle);
        const opacity = p < GROW_END ? lerp(0, 0.75, grow) : lerp(0.75, backgroundOpacity, settle);
        place(coreEl, centerX, centerY, scale, opacity, lerp(140, 0, grow));
      }

      // The sparkle: flare, arc across, burst.
      const sparkleAt = (q: number) => {
        if (q <= SHRINK_END) return { x: anchorX, y: anchorY + (window.scrollY - q * end) - (window.scrollY - p * end) };
        const t = easeInOut(range(q, SHRINK_END, TRAVEL_END));
        // A quadratic arc that bows up and toward the far side before landing in the centre.
        const controlX = lerp(launchX, centerX, 0.5) + (launchX > centerX ? -1 : 1) * vw * 0.12;
        const controlY = Math.min(launchY, centerY) - vh * 0.28;
        return {
          x: (1 - t) ** 2 * launchX + 2 * (1 - t) * t * controlX + t ** 2 * centerX,
          y: (1 - t) ** 2 * launchY + 2 * (1 - t) * t * controlY + t ** 2 * centerY,
        };
      };

      const visible = p > FLARE_START && p < BURST_END;
      if (visible) {
        const flare = easeOut(range(p, FLARE_START, SHRINK_END));
        const burst = range(p, TRAVEL_END, BURST_END);
        const { x, y } = sparkleAt(p);
        const scale = flare * lerp(1, 3.2, easeOut(burst)) * (1 + 0.12 * Math.sin(p * 90));
        place(sparkleEl, x, y, scale, clamp(flare * (1 - burst)), p * 720);
      } else {
        sparkleEl.style.opacity = '0';
      }

      // A fading trail of where the sparkle has just been.
      trail.current.forEach((dot, index) => {
        if (!dot) return;
        const q = p - (index + 1) * 0.012;
        const inFlight = q > SHRINK_END && q < TRAVEL_END && p < BURST_END;
        if (!inFlight) { dot.style.opacity = '0'; return; }
        const { x, y } = sparkleAt(q);
        place(dot, x, y, 1 - index / (TRAIL + 1), (1 - index / TRAIL) * 0.7);
      });

      // A shockwave ring when the sparkle bursts into the core.
      const shock = range(p, TRAVEL_END, 0.88);
      if (shock > 0 && shock < 1) place(ringEl, centerX, centerY, lerp(0.1, (backgroundSize * 1.3) / 200, easeOut(shock)), 1 - shock);
      else ringEl.style.opacity = '0';
    };

    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(render); };
    const relayout = () => { layout(); schedule(); };

    layout();
    render();
    coreEl.dataset.ready = '';
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', relayout);
    // Fonts and late layout can move the anchor and the About block.
    const observer = new ResizeObserver(relayout);
    observer.observe(document.body);
    // Motion preference changes switch between the journey and the still layout.
    const attributes = new MutationObserver(schedule);
    attributes.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion', 'data-intro'] });

    // ---- Mouse interaction with the hero reactor -------------------------------------------
    // Energy rises as the pointer nears the core: the rings spread and spin faster, a targeting
    // reticle tracks the pointer, and a click fires a repulsor pulse. Fine pointers and motion on only.
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reticleEl = reticle.current;
    const glowEl = glow.current;
    let energy = 0;
    let target = 0;
    let boost = 0;
    let angle = 0;
    let interactFrame = 0;
    const spins = () => coreEl.getAnimations({ subtree: true })
      .filter((animation) => animation instanceof CSSAnimation && animation.animationName === 'reactor-spin');
    const heroActive = () => window.scrollY / end < 0.12 && getMotion() === 'on' && !document.documentElement.dataset.intro;
    const step = () => {
      interactFrame = 0;
      energy += (target - energy) * 0.12;
      boost *= 0.93;
      const level = Math.min(1, energy + boost * 0.6);
      coreEl.style.setProperty('--energy', level.toFixed(3));
      if (reticleEl) {
        reticleEl.style.opacity = energy.toFixed(3);
        reticleEl.style.transform = `rotate(${angle}deg)`;
      }
      const rate = 1 + energy * 6 + boost * 20;
      for (const animation of spins()) animation.playbackRate = rate;
      if (Math.abs(target - energy) > 0.002 || boost > 0.01) {
        interactFrame = window.requestAnimationFrame(step);
      } else {
        energy = target;
        boost = 0;
        if (target === 0) for (const animation of spins()) animation.playbackRate = 1;
      }
    };
    const kick = () => { if (!interactFrame) interactFrame = window.requestAnimationFrame(step); };
    const onPointer = (event: PointerEvent) => {
      if (!finePointer.matches || event.pointerType !== 'mouse') return;
      const box = anchor.getBoundingClientRect();
      const dx = event.clientX - (box.left + box.width / 2);
      const dy = event.clientY - (box.top + box.height / 2);
      const radius = box.width / 2;
      const next = heroActive() ? clamp(1 - (Math.hypot(dx, dy) - radius * 0.55) / (radius * 1.1)) : 0;
      if (next === 0 && target === 0) return;
      target = next;
      angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      kick();
    };
    const onLeave = () => { target = 0; kick(); };
    const onPulse = () => {
      if (!heroActive()) return;
      boost = 1;
      kick();
      const box = anchor.getBoundingClientRect();
      const at = `translate3d(${box.left + box.width / 2}px, ${box.top + box.height / 2}px, 0) translate(-50%, -50%)`;
      ringEl.animate(
        [{ transform: `${at} scale(0.2)`, opacity: 1 }, { transform: `${at} scale(${(box.width * 1.5) / 200})`, opacity: 0 }],
        { duration: 800, easing: 'cubic-bezier(0.1, 0.8, 0.2, 1)' },
      );
      glowEl?.animate([{ opacity: 1, transform: 'scale(1.4)' }, { opacity: 0, transform: 'scale(1)' }], { duration: 650, easing: 'ease-out' });
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    anchor.addEventListener('pointerdown', onPulse);

    return () => {
      window.cancelAnimationFrame(interactFrame);
      window.removeEventListener('pointermove', onPointer);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      anchor.removeEventListener('pointerdown', onPulse);
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', relayout);
      observer.disconnect();
      attributes.disconnect();
    };
  }, []);

  return (
    <div className="core-stage no-print pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div ref={ring} className="core-ring absolute left-0 top-0 h-[200px] w-[200px] rounded-full opacity-0" />
      <div ref={core} className="core-body absolute left-0 top-0 opacity-0" data-core-body>
        <div className="tilt h-full w-full" data-tilt>
          <div className="core-entrance ambient-reactor relative h-full w-full">
            <div className="absolute inset-[22%] rounded-full bg-cyan/15 blur-3xl" />
            <ArcReactor id="core" core={<span className="core-initials">K.B</span>} />
            <div ref={glow} className="core-energy absolute inset-[30%] rounded-full" />
            {/* Targeting reticle: turns to face the pointer while it is near. */}
            <svg ref={reticle} viewBox="0 0 200 200" className="core-reticle absolute inset-[-4%] h-[108%] w-[108%] opacity-0">
              <circle cx="100" cy="100" r="97" fill="none" stroke="#61E8FF" strokeOpacity="0.35" strokeWidth="0.6" strokeDasharray="1 3" />
              <path d="M74 7.2A97 97 0 0 1 126 7.2" fill="none" stroke="#61E8FF" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M100 0l-4 -7h8z" fill="#fff" />
              <path d="M30 31A97 97 0 0 0 9 63M170 31A97 97 0 0 1 191 63" fill="none" stroke="#61E8FF" strokeOpacity="0.6" strokeWidth="0.8" />
            </svg>
          </div>
        </div>
      </div>
      {Array.from({ length: TRAIL }, (_, index) => (
        <span
          key={index}
          ref={(element) => { trail.current[index] = element; }}
          className="core-trail absolute left-0 top-0 h-2 w-2 rounded-full opacity-0"
        />
      ))}
      <div ref={sparkle} className="core-sparkle absolute left-0 top-0 h-16 w-16 opacity-0">
        <span className="absolute inset-[-120%] rounded-full bg-[radial-gradient(circle,rgba(97,232,255,0.55)_0%,rgba(33,140,255,0.18)_35%,transparent_70%)]" />
        <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full">
          <path d="M32 0C33.6 24 40 30.4 64 32 40 33.6 33.6 40 32 64 30.4 40 24 33.6 0 32 24 30.4 30.4 24 32 0Z" fill="#fff" />
          <path d="M32 14C32.8 27 37 31.2 50 32 37 32.8 32.8 37 32 50 31.2 37 27 32.8 14 32 27 31.2 31.2 27 32 14Z" fill="#61E8FF" transform="rotate(45 32 32)" />
        </svg>
      </div>
    </div>
  );
}
