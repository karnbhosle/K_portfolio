'use client';

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { getMotion } from '@/lib/preferences';
import { order } from '@/lib/style';

export type TimelineRow = {
  id: string;
  degree: string;
  short: string;
  institution: string;
  period: string;
  status: string | null;
  result: string | null;
  span: [number, number] | null;
};

const PLAY_MS = 5200;

/**
 * The education trajectory as a scrubbable timeline. Move across the tracks (or use the slider,
 * or play it) and a time cursor reads out where Karna was that year; the rows it crosses light up.
 * Without JavaScript it is the same static chart.
 */
export function EducationTimeline({ rows, min, max }: { rows: TimelineRow[]; min: number; max: number }) {
  const total = Math.max(1, max - min);
  const axis = Array.from({ length: total + 1 }, (_, index) => min + index);
  const grid = { backgroundSize: `calc(100% / ${total}) 100%` } as CSSProperties;
  const [cursor, setCursor] = useState<number | null>(null); // hover or playback position
  const [pinned, setPinned] = useState<number | null>(null); // slider or click position
  const [today, setToday] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const frame = useRef(0);
  const tracks = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const now = new Date();
    const value = now.getFullYear() + now.getMonth() / 12;
    // Known only in the browser, so it never mismatches the server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (value >= min && value <= max) setToday(value);
    return () => window.cancelAnimationFrame(frame.current);
  }, [min, max]);

  const at = cursor ?? pinned;
  const position = (year: number) => `${((year - min) / total) * 100}%`;
  const inside = (row: TimelineRow, year: number) => Boolean(row.span && year >= row.span[0] && year < row.span[1]);

  const describe = (year: number) => {
    const whole = Math.floor(year);
    const hits = rows.filter((row) => inside(row, year));
    if (hits.length) {
      return `${whole} · ${hits.map((row) => {
        const [start, end] = row.span!;
        return `${row.short}, year ${Math.floor(year - start) + 1} of ${end - start}${row.status ? ` (${row.status.toLowerCase()})` : ''}`;
      }).join(' · ')}`;
    }
    const sorted = rows.filter((row) => row.span).sort((a, b) => a.span![0] - b.span![0]);
    const before = [...sorted].reverse().find((row) => row.span![1] <= year);
    const after = sorted.find((row) => row.span![0] > year);
    const done = (row: TimelineRow) => `${row.short} complete${row.result ? `, ${row.result}` : ''}`;
    if (before && after) return `${whole} · ${done(before)} · next, ${after.short}`;
    if (before) return `${whole} · ${done(before)}`;
    return `${whole}`;
  };

  const fromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const box = tracks.current?.getBoundingClientRect();
    if (!box?.width) return null;
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    return min + ratio * total;
  };

  const play = () => {
    window.cancelAnimationFrame(frame.current);
    if (getMotion() !== 'on') {
      setPinned(today ?? max - 0.01);
      return;
    }
    setPlaying(true);
    setPinned(null);
    const started = performance.now();
    const end = today ?? max;
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / PLAY_MS);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      setCursor(min + eased * (end - min));
      if (t < 1) frame.current = window.requestAnimationFrame(tick);
      else { setPlaying(false); setCursor(null); setPinned(end - 0.001); }
    };
    frame.current = window.requestAnimationFrame(tick);
  };

  return (
    <div className="relative z-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="label">Education trajectory</h3>
        <p className="flex items-center gap-4 text-xs text-ink-subtle">
          <span className="flex items-center gap-2"><span className="h-2 w-5 rounded-xs bg-gradient-to-r from-signal/60 to-cyan/70" aria-hidden="true" /> Completed</span>
          <span className="flex items-center gap-2"><span className="in-progress h-2 w-5 rounded-xs bg-copper" aria-hidden="true" /> In progress</span>
        </p>
      </div>

      {/* Controls: a readout of the cursor, the scrubber and playback. */}
      <div className="mt-6 grid gap-3 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-center lg:gap-10">
        <button
          type="button"
          onClick={play}
          disabled={playing}
          className="inline-flex h-9 w-fit items-center gap-2 rounded-sm border border-cyan-line px-3 font-mono text-xs font-medium uppercase tracking-[0.08em] text-cyan transition-colors duration-fast hover:bg-white/5 disabled:opacity-70"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 1v8l7-4-7-4Z" fill="currentColor" /></svg>
          {playing ? 'Playing…' : 'Play the journey'}
        </button>
        <p className="timeline-readout min-h-[1lh] font-mono text-xs uppercase tracking-[0.08em] text-ink-muted" aria-hidden="true">
          {at === null ? <span className="text-ink-subtle">Move across the tracks, drag the slider or press play.</span> : <span className="text-ink">{describe(at)}</span>}
        </p>
      </div>

      <div className="mt-6 grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-10">
        <span className="hidden lg:block" />
        <div className="relative">
          {/* Year axis */}
          <div className="relative h-5" aria-hidden="true">
            {axis.map((year, index) => (
              <span
                key={year}
                className={`absolute top-0 -translate-x-1/2 font-mono text-[0.6875rem] tabular-nums transition-colors duration-fast ${at !== null && Math.floor(at) === year ? 'text-cyan' : 'text-ink-subtle'} ${index % 2 ? 'hidden sm:block' : ''} first:translate-x-0 last:-translate-x-full`}
                style={{ left: position(year) }}
              >
                {year}
              </span>
            ))}
          </div>
          {/* The scrubber: a native range input, so keyboards and screen readers get it for free. */}
          <label className="sr-only" htmlFor="timeline-scrub">Timeline year</label>
          <input
            id="timeline-scrub"
            type="range"
            min={min}
            max={max - 0.01}
            step={0.25}
            value={at ?? min}
            aria-valuetext={at === null ? `${min}` : describe(at)}
            onChange={(event) => { window.cancelAnimationFrame(frame.current); setPlaying(false); setCursor(null); setPinned(Number(event.target.value)); }}
            className="timeline-scrub mt-1 block w-full"
          />
        </div>
      </div>

      <div className="relative mt-2">
        <ol className="space-y-2">
          {rows.map((row, index) => {
            const current = Boolean(row.status);
            const hit = at !== null && inside(row, at);
            const dim = at !== null && !hit && row.span !== null && row.span[0] > at; // only the years still ahead
            const fill = row.span && at !== null ? Math.min(1, Math.max(0, (at - row.span[0]) / (row.span[1] - row.span[0]))) : 1;
            return (
              <li
                key={row.id}
                data-reveal
                style={order(index)}
                data-hit={hit ? '' : undefined}
                className={`timeline-row grid gap-3 border-t border-line pb-3 pt-5 transition-opacity duration-base lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-center lg:gap-10 ${dim ? 'opacity-45' : ''}`}
              >
                <div className="min-w-0">
                  <p className={`font-mono text-xs tabular-nums ${current ? 'text-copper' : 'text-ink-subtle'}`}>{row.period}</p>
                  <p className={`mt-1 font-display text-lg font-medium leading-snug transition-colors duration-fast sm:text-xl ${hit ? 'text-white' : 'text-ink'}`}>{row.degree}</p>
                  <p className="mt-0.5 text-sm text-ink-muted">{row.institution}</p>
                  {row.result ? <p className="sr-only">Result: {row.result}</p> : null}
                  {row.status ? (
                    <p className="mt-2.5 inline-flex items-center gap-2 rounded-sm border border-copper-line bg-copper-soft px-2 py-0.5 font-mono text-xs uppercase tracking-[0.08em] text-copper">
                      <span className="status-led h-1.5 w-1.5 rounded-full bg-copper" aria-hidden="true" /> {row.status}
                    </p>
                  ) : null}
                </div>
                <div
                  className="relative h-9 rounded-sm bg-[linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)]"
                  style={grid}
                  aria-hidden="true"
                >
                  {row.span ? (
                    <span
                      className={`timeline-bar draw-x absolute inset-y-2 overflow-hidden rounded-xs ${
                        current ? 'in-progress bg-copper shadow-[0_0_24px_-4px_rgba(201,138,69,0.8)]' : 'bg-gradient-to-r from-signal/60 to-cyan/70'
                      }`}
                      style={{ left: position(row.span[0]), width: `${((row.span[1] - row.span[0]) / total) * 100}%`, ...order(index) }}
                    >
                      {/* While the cursor is inside, the part already lived glows brighter. */}
                      {hit ? <span className={`absolute inset-y-0 left-0 ${current ? 'bg-white/35' : 'bg-white/30'}`} style={{ width: `${fill * 100}%` }} /> : null}
                    </span>
                  ) : null}
                  {row.span && row.result && !row.status && at !== null && at >= row.span[1] ? (
                    <span className="timeline-result absolute -top-1 -translate-x-full -translate-y-full whitespace-nowrap rounded-xs border border-cyan-line bg-black/85 px-1.5 font-mono text-[0.625rem] font-semibold tabular-nums tracking-[0.06em] text-cyan" style={{ left: position(row.span[1]) }}>
                      {row.result}
                    </span>
                  ) : null}
                  {hit && row.span ? (
                    <span className="timeline-tag absolute -top-1 -translate-y-full whitespace-nowrap rounded-xs bg-black/80 px-1.5 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-cyan" style={{ left: position(row.span[0]) }}>
                      {row.short} · yr {Math.floor(at! - row.span[0]) + 1}/{row.span[1] - row.span[0]}{row.status && row.result ? ` · ${row.result}` : ''}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>

        {/* Pointer surface + cursor, over the track column only. */}
        <div className="pointer-events-none absolute inset-0 grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-10">
          <span className="hidden lg:block" />
          <div
            ref={tracks}
            className="timeline-surface pointer-events-auto relative cursor-crosshair"
            onPointerMove={(event) => { if (!playing && event.pointerType === 'mouse') setCursor(fromPointer(event)); }}
            onPointerLeave={() => { if (!playing) setCursor(null); }}
            onPointerDown={(event) => { const year = fromPointer(event); if (year !== null && !playing) setPinned(year); }}
            aria-hidden="true"
          >
            {today !== null ? (
              <span className="absolute inset-y-0 w-px border-l border-dashed border-copper/60" style={{ left: position(today) }}>
                <span className="absolute -bottom-5 left-0 -translate-x-1/2 font-mono text-[0.625rem] uppercase tracking-[0.1em] text-copper">Now</span>
              </span>
            ) : null}
            {at !== null ? (
              <span className="timeline-cursor absolute inset-y-0 w-px bg-cyan" style={{ left: position(at) }}>
                <span className="absolute -top-3 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-cyan shadow-[0_0_10px_#61e8ff]" />
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
