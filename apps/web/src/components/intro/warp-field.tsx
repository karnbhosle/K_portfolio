'use client';

import { useEffect, useRef } from 'react';
import { getMotion, useIntroPhase } from '@/lib/preferences';

/*
 * The jump to warp, played over the deep-space photo while the reactor ignites. Stars sit almost
 * still, then stretch into streaks racing out from the centre as the core charges (3.15 s, timed
 * to the repulsor clip), and snap to full warp with a blue-white flash on the blast. Motion off: nothing.
 * The reactor is kept clear: everything here is erased inside a soft circle around it, so the warp
 * plays around the core and never through it.
 */
const CHARGE_S = 3.15;

type Star = { x: number; y: number; z: number; pz: number; hue: number };

export function WarpField() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const phase = useIntroPhase();
  const state = useRef({ startedAt: 0, jumpedAt: 0 });

  // Record when each beat lands; the drawing loop reads these.
  useEffect(() => {
    const now = performance.now();
    if (phase === 'charging') state.current = { startedAt: now, jumpedAt: 0 };
    if (phase === 'discharge' && !state.current.jumpedAt) state.current.jumpedAt = now;
    if (phase === 'pending' || phase === null) state.current = { startedAt: 0, jumpedAt: 0 };
  }, [phase]);

  const running = phase === 'charging' || phase === 'discharge' || phase === 'leaving';

  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext('2d');
    if (!element || !ctx || !running || getMotion() !== 'on') return;

    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    let w = 0;
    let h = 0;
    // The reactor's footprint in canvas coordinates, measured outside the charge shake.
    const clear = { x: 0, y: 0, r: 0 };
    const fit = () => {
      w = element.clientWidth;
      h = element.clientHeight;
      element.width = Math.round(w * dpr);
      element.height = Math.round(h * dpr);
      const reactor = document.querySelector('.intro-reactor')?.getBoundingClientRect();
      const frame = element.getBoundingClientRect();
      if (reactor && reactor.width) {
        clear.x = reactor.left + reactor.width / 2 - frame.left;
        clear.y = reactor.top + reactor.height / 2 - frame.top;
        clear.r = (reactor.width / 2) * 1.04;
      }
    };
    fit();
    window.addEventListener('resize', fit);

    const count = w < 768 ? 380 : 760;
    const spawn = (anywhere: boolean): Star => {
      const z = anywhere ? 0.05 + Math.random() * 0.95 : 0.85 + Math.random() * 0.15;
      // Keep a clear lane through the middle so the core stays readable.
      let x = 0;
      let y = 0;
      do { x = (Math.random() * 2 - 1) * 1.6; y = (Math.random() * 2 - 1) * 1.6; } while (Math.hypot(x, y) < 0.08);
      return { x, y, z, pz: z, hue: Math.random() };
    };
    const stars = Array.from({ length: count }, () => spawn(true));

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { startedAt, jumpedAt } = state.current;
      const charge = startedAt ? Math.min(1, (now - startedAt) / 1000 / CHARGE_S) : 0;
      const jump = jumpedAt ? Math.min(1, (now - jumpedAt) / 450) : 0;
      // Speed in depth units per second: a crawl, an accelerating build, then the jump.
      const speed = 0.04 + charge ** 3 * 2.4 + jump * 4.5;
      const stretch = 0.02 + charge ** 2.2 * 0.5 + jump * 0.9;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const focal = Math.max(w, h) * 0.42;

      // The tunnel: a blue bloom deepening at the vanishing point as speed builds.
      const bloom = Math.min(1, charge * 0.8 + jump);
      if (bloom > 0.02) {
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.6);
        glow.addColorStop(0, `rgba(120, 200, 255, ${0.28 * bloom})`);
        glow.addColorStop(0.35, `rgba(33, 110, 255, ${0.12 * bloom})`);
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (const star of stars) {
        star.pz = star.z;
        star.z -= speed * dt;
        const tail = star.z + stretch;
        const sx = cx + (star.x / star.z) * focal;
        const sy = cy + (star.y / star.z) * focal;
        if (star.z <= 0.02 || sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) {
          Object.assign(star, spawn(false));
          continue;
        }
        const tx = cx + (star.x / tail) * focal;
        const ty = cy + (star.y / tail) * focal;
        const near = 1 - star.z;
        const alpha = Math.min(1, 0.15 + near * 1.1);
        // Mostly blue-white, a few cyan and a few warm, like light shifted by the speed.
        const color = star.hue < 0.7 ? `rgba(210, 232, 255, ${alpha})` : star.hue < 0.92 ? `rgba(97, 232, 255, ${alpha})` : `rgba(255, 214, 170, ${alpha})`;
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.6 + near * (1.6 + jump * 1.4);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';

      // The jump flash: a blue-white wash that peaks as the ship hits warp.
      if (jump > 0) {
        const flash = Math.sin(Math.min(1, jump * 1.6) * Math.PI) * 0.55;
        ctx.fillStyle = `rgba(190, 225, 255, ${flash})`;
        ctx.fillRect(0, 0, w, h);
      }

      // Keep the reactor clear: cut a soft-edged hole around it through everything drawn above.
      if (clear.r) {
        const feather = clear.r * 0.18;
        const hole = ctx.createRadialGradient(clear.x, clear.y, clear.r, clear.x, clear.y, clear.r + feather);
        hole.addColorStop(0, 'rgba(0, 0, 0, 1)');
        hole.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = hole;
        ctx.beginPath();
        ctx.arc(clear.x, clear.y, clear.r + feather, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(clear.x, clear.y, clear.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => { window.cancelAnimationFrame(raf); window.removeEventListener('resize', fit); };
  }, [running]);

  return <canvas ref={canvas} className="warp-field absolute inset-0 h-full w-full" aria-hidden="true" />;
}
