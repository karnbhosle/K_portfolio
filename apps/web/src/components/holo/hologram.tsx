'use client';

import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { chiptune } from '@/lib/chiptune';
import { getMotion, getSound } from '@/lib/preferences';
import { scenes, type Frame, type SceneName, type V3 } from './scenes';

const CAMERA = 3.4;

/** Rotates, projects and draws one frame: additive glow, nearer lines brighter and wider. */
function draw(ctx: CanvasRenderingContext2D, w: number, h: number, frame: Frame, yaw: number, pitch: number, zoom: number) {
  ctx.clearRect(0, 0, w, h);
  const size = Math.min(w, h) * zoom;
  const cx = w / 2;
  const cy = h / 2;
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const project = ([x, y, z]: V3) => {
    const x1 = x * cosY + z * sinY;
    const z1 = -x * sinY + z * cosY;
    const y2 = y * cosP - z1 * sinP;
    const z2 = y * sinP + z1 * cosP;
    const s = CAMERA / (CAMERA + z2);
    return { x: cx + x1 * s * size, y: cy - y2 * s * size, z: z2, s };
  };
  // Nearer (negative z) is brighter.
  const near = (z: number) => Math.max(0, Math.min(1, (1.5 - z) / 3));

  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const stroke of frame.strokes) {
    const pts = stroke.pts.map(project);
    const base = stroke.alpha ?? 1;
    const width = stroke.width ?? 1;
    ctx.strokeStyle = stroke.color;
    for (let index = 1; index < pts.length; index += 1) {
      const a = pts[index - 1]!;
      const b = pts[index]!;
      if (stroke.cull && a.z > 0.02 && b.z > 0.02) continue; // behind the globe
      const depth = near((a.z + b.z) / 2);
      const alpha = base * (0.12 + 0.88 * depth);
      if (alpha < 0.02) continue;
      const lineWidth = width * ((a.s + b.s) / 2);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.globalAlpha = alpha * 0.16;
      ctx.lineWidth = lineWidth * 4;
      ctx.stroke();
      ctx.globalAlpha = alpha;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }
  for (const dot of frame.dots) {
    const p = project(dot.p);
    if (dot.cull && p.z > 0.02) continue;
    const alpha = (dot.alpha ?? 1) * (0.25 + 0.75 * near(p.z));
    const r = dot.size * p.s;
    const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.6);
    glow.addColorStop(0, dot.color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha * 0.55;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.8, r * 0.42), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.font = '600 10px "JetBrains Mono", ui-monospace, monospace';
  ctx.textBaseline = 'middle';
  for (const tag of frame.tags ?? []) {
    const p = project(tag.p);
    ctx.globalAlpha = 0.35 + 0.65 * near(p.z);
    ctx.fillStyle = tag.color;
    ctx.fillText(tag.text.toUpperCase(), p.x + 9, p.y - 1);
  }
  ctx.globalAlpha = 1;
}

const start: Record<SceneName, { yaw: number; pitch: number; zoom: number }> = {
  core: { yaw: 0.4, pitch: -0.32, zoom: 0.31 },
  globe: { yaw: -0.35, pitch: -0.36, zoom: 0.4 },
};

/**
 * A draggable wireframe hologram. It turns on its own (unless motion is paused), follows a drag
 * with inertia, answers a click or Enter with a pulse, and idles off-screen.
 */
export function Hologram({ scene, code, title, hint = 'Drag to rotate · click to pulse', label, className = '', caption = true }: {
  scene: SceneName; code: string; title: string; hint?: string; label: string; className?: string;
  /** False when the page sets the title in its own layout, outside the projector. */
  caption?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pulseRef = useRef<() => void>(() => {});
  const nudgeRef = useRef<(dyaw: number, dpitch: number) => void>(() => {});

  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext('2d');
    if (!element || !ctx) return;
    const build = scenes[scene];
    const view = { ...start[scene], vyaw: 0, vpitch: 0 };
    const box = { w: 0, h: 0, dpr: 1 };
    let energy = 0;
    let clock = 0;
    let last = performance.now();
    let raf = 0;
    let onScreen = false;
    let dirty = true;
    const drag = { active: false, x: 0, y: 0, moved: 0, id: -1 };
    const hover = { x: 0, y: 0 };

    const fit = () => {
      const rect = element.getBoundingClientRect();
      box.dpr = Math.min(2, window.devicePixelRatio || 1);
      box.w = rect.width;
      box.h = rect.height;
      element.width = Math.round(rect.width * box.dpr);
      element.height = Math.round(rect.height * box.dpr);
      dirty = true;
      schedule();
    };

    const tick = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const moving = getMotion() === 'on';
      if (moving) clock += dt;
      if (!drag.active) {
        // Inertia from a fling, easing back to a slow idle turn.
        if (scene === 'globe') {
          // The globe keeps Mumbai in view: it sways around it and drifts home after a drag.
          view.yaw += view.vyaw * dt;
          const home = start.globe.yaw + (moving ? Math.sin(clock * 0.3) * 0.55 : 0);
          const off = Math.atan2(Math.sin(home - view.yaw), Math.cos(home - view.yaw));
          view.yaw += off * Math.min(1, dt * 0.7);
        } else {
          view.yaw += view.vyaw * dt + (moving ? dt * 0.12 : 0);
        }
        view.pitch += view.vpitch * dt;
        const damp = Math.exp(-dt * 2.6);
        view.vyaw *= damp;
        view.vpitch *= damp;
        // Lean gently toward the pointer, and drift the pitch back to its resting angle.
        const rest = start[scene].pitch + hover.y * 0.25;
        view.pitch += (rest - view.pitch) * Math.min(1, dt * 1.5);
      }
      view.pitch = Math.max(-1.3, Math.min(1.1, view.pitch));
      energy = Math.max(0, energy - dt * 1.4);
      const busy = moving || drag.active || energy > 0 || Math.abs(view.vyaw) > 0.002 || Math.abs(view.vpitch) > 0.002;
      if (busy || dirty) {
        dirty = false;
        ctx.setTransform(box.dpr, 0, 0, box.dpr, 0, 0);
        draw(ctx, box.w, box.h, build(clock, energy), view.yaw + hover.x * 0.2, view.pitch, start[scene].zoom);
      }
      if (onScreen && !document.hidden && (busy || dirty)) schedule();
    };

    function schedule() {
      if (!raf && onScreen) { last = performance.now(); raf = window.requestAnimationFrame(tick); }
    }

    pulseRef.current = () => {
      energy = 1;
      view.vyaw += 2.4;
      if (getSound() === 'on') chiptune().sfx('ping');
      schedule();
    };
    nudgeRef.current = (dyaw, dpitch) => { view.vyaw += dyaw; view.vpitch += dpitch; schedule(); };

    const down = (event: PointerEvent) => {
      drag.active = true;
      drag.x = event.clientX;
      drag.y = event.clientY;
      drag.moved = 0;
      drag.id = event.pointerId;
      element.setPointerCapture(event.pointerId);
      view.vyaw = 0;
      view.vpitch = 0;
      schedule();
    };
    const move = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      hover.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      hover.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      if (drag.active && event.pointerId === drag.id) {
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        drag.x = event.clientX;
        drag.y = event.clientY;
        drag.moved += Math.abs(dx) + Math.abs(dy);
        view.yaw += dx * 0.01;
        view.pitch -= dy * 0.01;
        view.vyaw = dx * 0.6;
        view.vpitch = -dy * 0.6;
      }
      dirty = true;
      schedule();
    };
    const up = (event: PointerEvent) => {
      if (!drag.active || event.pointerId !== drag.id) return;
      drag.active = false;
      if (drag.moved < 6) pulseRef.current();
      schedule();
    };
    const leave = () => { hover.x = 0; hover.y = 0; dirty = true; schedule(); };

    element.addEventListener('pointerdown', down);
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerup', up);
    element.addEventListener('pointercancel', up);
    element.addEventListener('pointerleave', leave);

    const resize = new ResizeObserver(fit);
    resize.observe(element);
    const seen = new IntersectionObserver(([entry]) => {
      onScreen = Boolean(entry?.isIntersecting);
      dirty = true;
      schedule();
    }, { rootMargin: '100px' });
    seen.observe(element);
    const wake = () => { dirty = true; schedule(); };
    document.addEventListener('visibilitychange', wake);
    // A change to the motion preference flips <html data-motion>; redraw so it takes effect.
    const motion = new MutationObserver(wake);
    motion.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });

    return () => {
      window.cancelAnimationFrame(raf);
      resize.disconnect();
      seen.disconnect();
      motion.disconnect();
      document.removeEventListener('visibilitychange', wake);
      element.removeEventListener('pointerdown', down);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', up);
      element.removeEventListener('pointercancel', up);
      element.removeEventListener('pointerleave', leave);
    };
  }, [scene]);

  const onKey = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const moves: Record<string, [number, number]> = { ArrowLeft: [-1.6, 0], ArrowRight: [1.6, 0], ArrowUp: [0, 1.2], ArrowDown: [0, -1.2] };
    const nudge = moves[event.key];
    if (nudge) { event.preventDefault(); nudgeRef.current(nudge[0], nudge[1]); return; }
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pulseRef.current(); }
  };

  return (
    <figure className={`holo group ${/\b(absolute|fixed)\b/.test(className) ? '' : 'relative'} ${className}`}>
      <span className="holo-base pointer-events-none absolute inset-x-[12%] bottom-[6%] h-[18%] rounded-[50%]" aria-hidden="true" />
      <canvas
        ref={canvas}
        className="holo-canvas relative block h-full w-full cursor-grab touch-none select-none rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-cyan-line active:cursor-grabbing"
        tabIndex={0}
        role="img"
        aria-label={`${label} Use the arrow keys to turn it and Enter to pulse it.`}
        aria-roledescription="interactive 3D hologram"
        onKeyDown={onKey}
      />
      {caption ? (
        <figcaption className="pointer-events-none absolute inset-x-0 top-0 p-1 font-mono text-[0.625rem] uppercase tracking-[0.16em]">
          <span className="block text-cyan/80">{code}</span>
          <span className="mt-0.5 block text-ink">{title}</span>
        </figcaption>
      ) : null}
      <p className="pointer-events-none absolute bottom-0 right-0 p-1 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-subtle opacity-70 transition-opacity group-hover:opacity-100">{hint}</p>
    </figure>
  );
}
