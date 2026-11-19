'use client';

import { useEffect, useRef, useState } from 'react';
import type { PipelineStage } from '@karna/shared';
import { getMotion } from '@/lib/preferences';
import { order } from '@/lib/style';

const STAGE_MS = 650;

/** Fired on every run, including the first automatic one, so the case study can react (AeroSense reads live AQI). */
export const pipelineRunEvent = 'karna:pipeline-run';
export type PipelineRunDetail = { projectId: string; duration: number; auto: boolean };

/**
 * Ordered stages as an assembly line that can be run. It runs once by itself when it first comes
 * into view (with motion on), and "Run pipeline" replays it: each station charges, scans and locks in.
 */
export function PipelineSteps({ id, stages, accent, title }: { id: string; stages: PipelineStage[]; accent: 'cyan' | 'copper'; title: string }) {
  const [active, setActive] = useState(-1); // index of the running stage; stages.length when finished
  const root = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const autoRan = useRef(false);

  const tone = accent === 'copper'
    ? { text: 'text-copper', border: 'border-copper', line: 'border-copper-line', fill: 'bg-copper', glow: 'shadow-[0_0_24px_-2px_rgba(201,138,69,0.9)]', rule: 'from-copper to-copper/30' }
    : { text: 'text-cyan', border: 'border-cyan', line: 'border-cyan-line', fill: 'bg-cyan', glow: 'shadow-[0_0_24px_-2px_rgba(97,232,255,0.9)]', rule: 'from-cyan to-cyan/30' };
  const columns = stages.length >= 6 ? 'xl:grid-cols-6' : stages.length === 5 ? 'xl:grid-cols-5' : 'xl:grid-cols-4';
  const running = active >= 0 && active < stages.length;
  const done = active >= stages.length;

  const clear = () => { timers.current.forEach((timer) => window.clearTimeout(timer)); timers.current = []; };

  const run = (auto = false) => {
    clear();
    const pace = getMotion() === 'on' ? STAGE_MS : 80;
    {
      window.dispatchEvent(new CustomEvent<PipelineRunDetail>(pipelineRunEvent, { detail: { projectId: id, duration: stages.length * pace, auto } }));
    }
    for (let index = 0; index <= stages.length; index += 1) {
      timers.current.push(window.setTimeout(() => setActive(index), index * pace));
    }
  };

  // Run once by itself the first time the line is properly in view.
  useEffect(() => {
    const element = root.current;
    if (!element || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting) || autoRan.current || getMotion() !== 'on') return;
      autoRan.current = true;
      observer.disconnect();
      run(true);
    }, { threshold: 0.45 });
    observer.observe(element);
    return () => { observer.disconnect(); clear(); };
    // run is stable enough for a one-time trigger; re-subscribing would re-run it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={root}>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h4 className="label">{title}</h4>
        <div className="flex items-center gap-4">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-subtle" aria-live="polite">
            {done ? `${stages.length}/${stages.length} stages complete` : running ? `Stage ${active + 1} of ${stages.length}` : `${stages.length} stages, in order`}
          </p>
          <button
            type="button"
            onClick={() => run()}
            disabled={running}
            className={`inline-flex h-9 items-center gap-2 rounded-sm border px-3 font-mono text-xs font-medium uppercase tracking-[0.08em] transition-colors duration-fast disabled:opacity-70 ${tone.line} ${tone.text} hover:bg-white/5`}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 1v8l7-4-7-4Z" fill="currentColor" /></svg>
            {running ? 'Running…' : done ? 'Run again' : 'Run pipeline'}
          </button>
        </div>
      </div>

      <ol className={`grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-3 ${columns}`} data-reveal>
        {stages.map((stage, index) => {
          const state = index < active ? 'done' : index === active ? 'running' : 'idle';
          return (
            <li
              key={stage.title}
              style={order(index)}
              data-stage={state}
              className="pipeline-stage relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4 pb-7 last:pb-0 sm:block sm:pb-0"
            >
              {/* Phone rail */}
              {index < stages.length - 1 ? (
                <span className="absolute bottom-0 left-[1.125rem] top-9 w-px overflow-hidden bg-line-strong sm:hidden" aria-hidden="true">
                  <span className={`stage-fill-y absolute inset-0 origin-top ${tone.fill}`} />
                </span>
              ) : null}

              {/* Station marker + rail */}
              <div className="relative flex items-center sm:mb-5" aria-hidden="true">
                <span
                  className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-black font-mono text-xs tabular-nums transition-[box-shadow,border-color,color,background-color] duration-slow ${
                    state === 'running' ? `${tone.border} ${tone.text} ${tone.glow}` : state === 'done' ? `${tone.border} ${tone.fill} text-black` : `${tone.line} ${tone.text}`
                  }`}
                >
                  {state === 'done' ? '✓' : String(index + 1).padStart(2, '0')}
                  {state === 'running' ? <span className={`stage-ring absolute inset-[-6px] rounded-full border ${tone.border}`} /> : null}
                </span>
                {index < stages.length - 1 ? (
                  <>
                    <span className="absolute left-9 right-[-1.5rem] top-1/2 hidden h-px bg-line-strong sm:block" />
                    <span className={`draw-x absolute left-9 right-[-1.5rem] top-1/2 hidden h-px bg-gradient-to-r opacity-40 sm:block ${tone.rule}`} style={order(index)} />
                    <span className={`stage-fill-x absolute left-9 right-[-1.5rem] top-1/2 hidden h-[2px] -translate-y-[0.5px] origin-left sm:block ${tone.fill} ${tone.glow}`} />
                  </>
                ) : null}
              </div>

              <div className="stage-card relative pt-1.5 sm:pt-0">
                <span className="stage-scan pointer-events-none absolute -inset-2 rounded-md" aria-hidden="true" />
                <p className="font-display text-lg font-medium leading-snug text-ink">
                  <span className="sr-only">Stage {index + 1}: </span>{stage.title}
                </p>
                {stage.detail ? <p className="mt-1.5 text-sm text-ink-muted">{stage.detail}</p> : null}
                {stage.tools.length ? (
                  <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={`${stage.title} tools`}>
                    {stage.tools.map((tool) => <li key={tool} className="chip">{tool}</li>)}
                  </ul>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
