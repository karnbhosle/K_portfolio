'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArcReactor, ReactorMark } from '@/components/reactor/arc-reactor';
import { Volume, VolumeOff } from '@/components/ui/icons';
import {
  getIntroPhase, getMotion, getSound, replayIntroEvent, setIntroPhase, setSound, useIntroPhase, useSound,
} from '@/lib/preferences';
import { IgnitionAudio } from './ignition-audio';

const CHARGE_MS = 4600;
const QUICK_CHARGE_MS = 1200;
const DISCHARGE_MS = 800;
const LEAVE_MS = 600;

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
    if (skipped) audio.current?.stop();
    setIntroPhase('leaving');
    timers.current.push(window.setTimeout(() => {
      setIntroPhase(null);
      document.getElementById('know-karna-title')?.focus({ preventScroll: true });
    }, LEAVE_MS));
  }, [clearTimers]);

  const ignite = useCallback(() => {
    if (getIntroPhase() !== 'pending') return;
    const quick = getMotion() === 'off';
    const charge = quick ? QUICK_CHARGE_MS : CHARGE_MS;
    if (getSound() === 'on') audio.current?.play();
    setIntroPhase('charging');
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / charge);
      setProgress(Math.round(easeInOut(t) * 100));
      if (t < 1) frame.current = window.requestAnimationFrame(tick);
    };
    frame.current = window.requestAnimationFrame(tick);
    if (quick) {
      timers.current.push(window.setTimeout(() => finish(false), charge));
    } else {
      timers.current.push(window.setTimeout(() => setIntroPhase('discharge'), charge));
      timers.current.push(window.setTimeout(() => finish(false), charge + DISCHARGE_MS));
    }
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
      <div className="intro-flash pointer-events-none absolute inset-0 bg-white" aria-hidden="true" />

      <div className="relative z-10 flex items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-5">
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
        <div className="intro-stage mt-7 sm:mt-9">
          <button
            ref={trigger}
            type="button"
            onClick={ignite}
            disabled={phase !== 'pending'}
            aria-label="Ignite the arc reactor and enter the portfolio"
            className="intro-trigger block rounded-full disabled:cursor-default"
          >
            <ArcReactor
              id="intro"
              className="intro-reactor w-[min(76vw,21rem)] sm:w-[25rem]"
              core={
                <span className="flex flex-col items-center text-center">
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

        <div className="mt-9 w-full max-w-[18rem] sm:mt-11">
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

      <p className="relative z-10 px-5 pb-5 text-center text-xs text-ink-subtle sm:pb-7">{tagline}</p>
    </div>
  );
}
