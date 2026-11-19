'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArcReactor, ReactorMark } from '@/components/reactor/arc-reactor';
import { Volume, VolumeOff } from '@/components/ui/icons';
import {
  getIntroPhase, getMotion, getSound, replayIntroEvent, setIntroPhase, setSound, useIntroPhase, useSound,
} from '@/lib/preferences';
import { IgnitionAudio } from './ignition-audio';

/*
 * Timed to the repulsor clip (5.5s). Its loudness envelope: a click at 1.00s, a second at 2.05s,
 * a rising whine from 2.65s, a breath of silence at 3.0s, the blast at 3.15s (peak 3.35s), and a
 * second, bigger boom at 4.05s that decays by ~4.9s. The CSS keyframes put their cues on the same beats.
 */
const CHARGE_MS = 3150; // click -> blast
const DISCHARGE_MS = 900; // blast -> second boom
const LEAVE_MS = 1400; // second boom -> the visor HUD boots and the faceplate opens onto the portfolio
const QUICK_CHARGE_MS = 1200; // motion and sound both off: nothing to sync to
const AUDIO_START_WAIT_MS = 250;
const MAX_LAG_MS = 400; // if the clip stalls, the visuals wait at most this long for it

const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

declare global {
  interface Window { __karnaIntroReady?: boolean }
}

/**
 * The ignition gate: press the arc reactor, it charges for 4.6s with the repulsor sound, discharges
 * in a flash and reveals the portfolio. Skippable at any moment, shown once per session, and
 * reduced to a short cross-fade when motion is off. The page is rendered underneath the whole time.
 */
export function IgnitionIntro({ name, tagline }: { name: string; tagline: string }) {
  const phase = useIntroPhase();
  const sound = useSound();
  const [progress, setProgress] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const audio = useRef<IgnitionAudio | null>(null);
  const timers = useRef<number[]>([]);
  const frame = useRef<number | undefined>(undefined);

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
    if (frame.current !== undefined) window.cancelAnimationFrame(frame.current);
    frame.current = undefined;
  }, []);

  const finish = useCallback((skipped: boolean) => {
    if (!getIntroPhase() || getIntroPhase() === 'leaving') return;
    clearTimers();
    const root = document.documentElement;
    if (skipped) {
      audio.current?.stop();
      root.dataset.introSkipped = ''; // skipping goes straight to the page, no suit-up
    }
    // The visor's targeting reticle locks onto the hero reactor.
    const target = document.querySelector('[data-core-anchor]')?.getBoundingClientRect();
    const overlay = document.querySelector<HTMLElement>('.intro');
    if (target && overlay && target.width) {
      overlay.style.setProperty('--lock-x', `${target.left + target.width / 2}px`);
      overlay.style.setProperty('--lock-y', `${target.top + target.height / 2}px`);
      overlay.style.setProperty('--lock-size', `${Math.min(target.width * 0.62, 420)}px`);
    }
    setIntroPhase('leaving');
    timers.current.push(window.setTimeout(() => {
      setIntroPhase(null);
      delete root.dataset.introSkipped;
      document.getElementById('know-karna-title')?.focus({ preventScroll: true });
    }, LEAVE_MS));
  }, [clearTimers]);

  const ignite = useCallback(async () => {
    if (getIntroPhase() !== 'pending') return;
    const withSound = getSound() === 'on';
    const quick = getMotion() === 'off' && !withSound;
    const charge = quick ? QUICK_CHARGE_MS : CHARGE_MS;
    // Start the visuals when the sound actually starts (usually within a frame or two), never later than 250ms.
    if (withSound && audio.current) {
      await Promise.race([audio.current.play(), new Promise((resolve) => window.setTimeout(resolve, AUDIO_START_WAIT_MS))]);
      if (getIntroPhase() !== 'pending') return;
    }
    setIntroPhase('charging');
    const started = performance.now();
    if (quick) {
      const tick = (now: number) => {
        const t = Math.min(1, (now - started) / charge);
        setProgress(Math.round(easeInOut(t) * 100));
        if (t < 1) frame.current = window.requestAnimationFrame(tick);
      };
      frame.current = window.requestAnimationFrame(tick);
      timers.current.push(window.setTimeout(() => finish(false), charge));
      return;
    }
    // The clip is the clock: the blast and the hand-off land on its beats wherever its playhead is.
    // A stalled clip can hold the visuals back by MAX_LAG_MS at most, so the intro never freezes.
    let discharged = false;
    const tick = (now: number) => {
      const wall = now - started;
      const heard = withSound ? audio.current?.time() : null;
      const clock = heard == null ? wall : Math.max(heard * 1000, wall - MAX_LAG_MS);
      setProgress(Math.round(easeInOut(Math.min(1, clock / CHARGE_MS)) * 100));
      if (!discharged && clock >= CHARGE_MS) { discharged = true; setIntroPhase('discharge'); }
      if (clock >= CHARGE_MS + DISCHARGE_MS) { frame.current = undefined; finish(false); return; }
      frame.current = window.requestAnimationFrame(tick);
    };
    frame.current = window.requestAnimationFrame(tick);
    // Backstops for a background tab, where animation frames stop.
    timers.current.push(window.setTimeout(() => { if (!discharged) { discharged = true; setIntroPhase('discharge'); } }, CHARGE_MS + MAX_LAG_MS));
    timers.current.push(window.setTimeout(() => finish(false), CHARGE_MS + DISCHARGE_MS + MAX_LAG_MS));
  }, [finish]);

  // Mount: mark hydration for the boot-script failsafe, warm up the sound, and cleanly tear down.
  useEffect(() => {
    window.__karnaIntroReady = true;
    const player = new IgnitionAudio();
    audio.current = player;
    if (getIntroPhase() === 'pending') player.preload();
    return () => {
      clearTimers();
      player.dispose();
    };
  }, [clearTimers]);

  // While the gate is up, the page behind it is inert; the reactor takes focus.
  useEffect(() => {
    const site = document.getElementById('site');
    if (site) site.inert = phase !== null && phase !== 'leaving';
    if (phase === 'pending') trigger.current?.focus({ preventScroll: true });
  }, [phase]);

  useEffect(() => {
    if (!phase || phase === 'leaving') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [phase, finish]);

  useEffect(() => {
    const replay = () => {
      clearTimers();
      audio.current?.stop();
      audio.current?.preload();
      setProgress(0);
      window.scrollTo({ top: 0, behavior: 'instant' });
      setIntroPhase('pending');
    };
    window.addEventListener(replayIntroEvent, replay);
    return () => window.removeEventListener(replayIntroEvent, replay);
  }, [clearTimers]);

  const charging = phase === 'charging' || phase === 'discharge';

  return (
    <div className="intro no-print" role="dialog" aria-modal="true" aria-labelledby="intro-title" aria-describedby="intro-hint">
      {/* Deep space behind the pinned reactor: the photo, graded toward the site's cyan, drifting slowly. */}
      <div className="intro-bg pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="intro-space absolute inset-[-8%]" />
        <div className="intro-space-grade absolute inset-0" />
        <div className="intro-space-tint absolute inset-0" />
      </div>
      <div className="intro-flash pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="intro-shock pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 rounded-full" aria-hidden="true" />
      {/* Suit-up: the faceplate seals on the second boom, the visor HUD boots, then the plates part. */}
      <div className="suit pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="suit-glow absolute inset-x-0" />
        <div className="suit-plate suit-plate-top absolute inset-x-[-2%] top-0" />
        <div className="suit-plate suit-plate-bottom absolute inset-x-[-2%] bottom-0" />
        <p className="suit-seal absolute inset-x-0 flex justify-center text-center"><span className="suit-seal-plate font-display font-semibold uppercase">Systems online</span></p>
      </div>
      <div className="suit-hud pointer-events-none absolute inset-0" aria-hidden="true">
        <span className="suit-vignette absolute inset-0" />
        <span className="suit-bracket absolute left-[5%] top-[9%] border-l-2 border-t-2" />
        <span className="suit-bracket absolute right-[5%] top-[9%] border-r-2 border-t-2" />
        <span className="suit-bracket absolute bottom-[9%] left-[5%] border-b-2 border-l-2" />
        <span className="suit-bracket absolute bottom-[9%] right-[5%] border-b-2 border-r-2" />
        <svg viewBox="0 0 200 200" className="suit-reticle absolute">
          <circle cx="100" cy="100" r="96" fill="none" stroke="#61E8FF" strokeWidth="1" strokeDasharray="2 5" />
          <path d="M100 2v18M100 180v18M2 100h18M180 100h18" stroke="#E8C36A" strokeWidth="2.5" />
          <path d="M38 38a88 88 0 0 1 34-24M162 162a88 88 0 0 1-34 24" fill="none" stroke="#61E8FF" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <div className="suit-boot absolute bottom-[13%] left-[7%] space-y-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.16em]">
          <p style={{ '--i': 0 } as CSSProperties}>Arc reactor <span className="text-[#E8C36A]">100%</span></p>
          <p style={{ '--i': 1 } as CSSProperties}>Interface ✓ · API ✓ · AI core ✓</p>
          <p style={{ '--i': 2 } as CSSProperties}>Target locked · {name}</p>
        </div>
        <p className="suit-tag absolute right-[7%] top-[13%] text-right font-mono text-[0.6875rem] uppercase tracking-[0.16em]">K.B · Mark I<br /><span className="text-ink-subtle">HUD online</span></p>
      </div>

      <div className="intro-chrome relative z-10 flex items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-5">
        <p className="flex min-w-0 items-center gap-2.5">
          <ReactorMark size={22} />
          <span className="truncate font-display font-semibold text-ink">{name}</span>
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn btn-quiet"
            aria-pressed={sound === 'on'}
            onClick={() => {
              if (sound === 'on') audio.current?.stop();
              setSound(sound === 'on' ? 'off' : 'on');
            }}
          >
            {sound === 'on' ? <Volume size={17} /> : <VolumeOff size={17} />} Sound
          </button>
          <button type="button" className="btn btn-quiet" onClick={() => finish(true)}>Skip intro</button>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-6">
        <p id="intro-title" className="intro-copy text-center font-mono text-xs uppercase tracking-[0.28em] text-cyan">
          Press the core to enter
        </p>
        <div className="intro-stage relative z-10 mt-7 sm:mt-9">
          <button
            ref={trigger}
            type="button"
            onClick={() => { void ignite(); }}
            disabled={phase !== 'pending'}
            aria-label="Ignite the arc reactor and enter the portfolio"
            className="intro-trigger block rounded-full disabled:cursor-default"
          >
            <ArcReactor
              id="intro"
              className="intro-reactor w-[min(76vw,21rem)] sm:w-[25rem]"
              core={
                <span className="core-label flex flex-col items-center text-center">
                  <span className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.3em] text-white/90">Engage</span>
                  <span className="mt-1 font-display text-lg font-semibold leading-tight text-white [text-shadow:0_0_14px_rgba(255,255,255,0.75)] sm:text-xl">
                    Karna<br />Bhosle
                  </span>
                  <span className="mt-1.5 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-white/80">MCA · SDE</span>
                </span>
              }
            />
          </button>
        </div>

        <div className="intro-chrome mt-9 w-full max-w-[18rem] sm:mt-11">
          <div className="flex justify-between font-mono text-xs text-ink-subtle">
            <span>Ignition</span>
            <span className="tabular-nums text-ink">{progress}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Ignition"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="mt-2 h-1 overflow-hidden rounded-full bg-line-strong"
          >
            <div className="intro-progress-fill h-full rounded-full bg-cyan" style={{ transform: `scaleX(${progress / 100})` }} />
          </div>
          <p id="intro-hint" className="intro-copy mt-4 text-center text-xs text-ink-subtle">
            <span className="[@media(hover:none)]:hidden">Click the core or press Enter. Esc skips.</span>
            <span className="hidden [@media(hover:none)]:inline">Tap the core to enter.</span>
          </p>
          <p className="sr-only" aria-live="polite">{charging ? 'Igniting. The portfolio opens in a moment.' : ''}</p>
        </div>
      </div>

      <div className="intro-chrome relative z-10 px-5 pb-5 text-center sm:pb-7">
        <p className="text-xs text-ink-subtle">{tagline}</p>
        <p className="mt-1.5 font-mono text-[0.625rem] text-ink-subtle/80">Background: Hubble Ultra Deep Field · NASA, ESA, S. Beckwith (STScI) and the HUDF Team</p>
      </div>
    </div>
  );
}
