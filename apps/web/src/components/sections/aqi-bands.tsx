'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { airQualitySource, fetchMumbaiAir, pollutantLabel, type AirReading } from '@/lib/air-quality';
import { getMotion } from '@/lib/preferences';
import { pipelineRunEvent, type PipelineRunDetail } from './pipeline-steps';

/**
 * India's National Air Quality Index bands (CPCB), the public standard AeroSense maps
 * predictions onto. Reference data about the standard, not measurements from the project.
 */
const bands = [
  { name: 'Good', range: '0–50', color: '#2E9E6A', impact: 'Minimal impact.' },
  { name: 'Satisfactory', range: '51–100', color: '#8DC63F', impact: 'Minor breathing discomfort for sensitive people.' },
  { name: 'Moderate', range: '101–200', color: '#E8C547', impact: 'Breathing discomfort for people with lung disease such as asthma, and discomfort for people with heart disease, children and older adults.' },
  { name: 'Poor', range: '201–300', color: '#E8893A', impact: 'Breathing discomfort for most people on prolonged exposure.' },
  { name: 'Very poor', range: '301–400', color: '#D9473F', impact: 'Respiratory illness on prolonged exposure.' },
  { name: 'Severe', range: '401–500', color: '#A3303B', impact: 'Affects healthy people and seriously impacts people with existing diseases.' },
] as const;

type Mode = 'idle' | 'spinning' | 'live' | 'error';

const CHASE_MS = 70; // a light every 70ms while the reading is fetched
const LAND_MS = 340; // the last step before it lands
const OWN_SPIN_MS = 2200;
const TIMEOUT_MS = 8000;

/**
 * The AQI scale doubles as a slot machine. Running the AeroSense pipeline (or "Read Mumbai now")
 * chases a light across the bands while today's air quality for Mumbai is fetched, then slows and
 * lands on the band the live reading falls in.
 */
export function AqiBands() {
  const [selected, setSelected] = useState(2);
  const [lit, setLit] = useState(-1);
  const [mode, setMode] = useState<Mode>('idle');
  const [reading, setReading] = useState<AirReading | null>(null);
  const [landed, setLanded] = useState(0); // bumps on each landing, to replay the jackpot flash
  const timer = useRef<number | undefined>(undefined);
  const abort = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const touched = useRef(false); // the visitor picked a band: automatic runs leave it alone
  const band = bands[selected];

  const stop = () => {
    window.clearTimeout(timer.current);
    abort.current?.abort();
  };

  const spin = (minimum: number) => {
    if (busy.current) return;
    busy.current = true;
    stop();
    setMode('spinning');
    const controller = new AbortController();
    abort.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
    let result: AirReading | null | undefined; // undefined while waiting, null on failure
    fetchMumbaiAir(controller.signal)
      .then((value) => { result = value; })
      .catch(() => { result = null; })
      .finally(() => window.clearTimeout(timeout));

    const settle = () => {
      busy.current = false;
      setLit(-1);
      if (result) {
        setReading(result);
        setSelected(result.band);
        setLanded((count) => count + 1);
        setMode('live');
      } else {
        setMode('error');
      }
    };

    if (getMotion() !== 'on') {
      const wait = () => { if (result === undefined) timer.current = window.setTimeout(wait, 100); else settle(); };
      wait();
      return;
    }

    const started = performance.now();
    let index = selected;
    const chase = () => {
      index = (index + 1) % bands.length;
      setLit(index);
      if (performance.now() - started < minimum || result === undefined) {
        timer.current = window.setTimeout(chase, CHASE_MS);
        return;
      }
      // Slow down over one more lap and stop on the live band, like reels running down.
      const target = result ? result.band : index;
      const steps = ((target - index + bands.length) % bands.length) + bands.length;
      const growth = (LAND_MS / CHASE_MS) ** (1 / steps);
      let left = steps;
      let delay = CHASE_MS;
      const coast = () => {
        if (left === 0) { settle(); return; }
        left -= 1;
        delay *= growth;
        index = (index + 1) % bands.length;
        setLit(index);
        timer.current = window.setTimeout(coast, delay);
      };
      timer.current = window.setTimeout(coast, delay);
    };
    chase();
  };

  // The AeroSense pipeline's "Run again" pulls the lever.
  const spinRef = useRef(spin);
  useEffect(() => { spinRef.current = spin; });
  useEffect(() => {
    const onRun = (event: Event) => {
      const detail = (event as CustomEvent<PipelineRunDetail>).detail;
      if (detail?.projectId !== 'aerosense' || (detail.auto && touched.current)) return;
      spinRef.current(Math.max(OWN_SPIN_MS, detail.duration));
    };
    window.addEventListener(pipelineRunEvent, onRun);
    return () => { window.removeEventListener(pipelineRunEvent, onRun); stop(); };
  }, []);

  const spinning = mode === 'spinning';

  return (
    <div className="rounded-lg border border-line bg-black/60 p-4 sm:p-6" data-aqi={mode}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-subtle">
          <span className={`status-led h-1.5 w-1.5 rounded-full bg-cyan ${spinning ? 'is-busy' : ''}`} style={{ backgroundColor: mode === 'live' ? band.color : undefined }} aria-hidden="true" />
          {spinning ? 'Reading Mumbai’s air…' : mode === 'live' ? `Live · Mumbai${reading?.time ? ` · ${reading.time} IST` : ''}` : 'Mumbai live feed · standby'}
        </p>
        <button
          type="button"
          onClick={() => spin(OWN_SPIN_MS)}
          disabled={spinning}
          className="inline-flex h-9 items-center gap-2 rounded-sm border border-cyan-line px-3 font-mono text-xs font-medium uppercase tracking-[0.08em] text-cyan transition-colors duration-fast hover:bg-white/5 disabled:opacity-70"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" /><circle cx="6" cy="6" r="1.6" fill="currentColor" /></svg>
          {spinning ? 'Reading…' : mode === 'live' ? 'Read again' : 'Read Mumbai now'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md bg-line min-[420px]:grid-cols-3 md:grid-cols-6" role="group" aria-label="CPCB AQI bands">
        {bands.map((entry, index) => {
          const active = index === selected && !spinning;
          const glowing = index === lit;
          const jackpot = active && mode === 'live';
          return (
            <button
              key={jackpot ? `${entry.name}-${landed}` : entry.name}
              type="button"
              aria-pressed={index === selected}
              onClick={() => {
                touched.current = true;
                if (spinning) { stop(); busy.current = false; setLit(-1); setMode(reading ? 'live' : 'idle'); }
                setSelected(index);
              }}
              className={`aqi-cell group relative min-h-16 px-3 pb-3 pt-4 text-left transition-colors duration-fast ${active ? 'bg-surface-overlay' : 'bg-surface hover:bg-surface-raised'} ${jackpot ? 'is-jackpot' : ''}`}
              style={{ '--band': entry.color } as CSSProperties}
              data-lit={glowing ? '' : undefined}
            >
              <span
                className={`aqi-bar absolute inset-x-0 top-0 transition-[height] duration-base ease-out ${active ? 'h-1.5' : 'h-1'}`}
                style={{ backgroundColor: entry.color, boxShadow: active ? `0 0 18px ${entry.color}` : undefined }}
                aria-hidden="true"
              />
              <span className={`relative block text-sm font-medium ${active || glowing ? 'text-ink' : 'text-ink-muted'}`}>{entry.name}</span>
              <span className="relative mt-0.5 block font-mono text-[0.6875rem] tabular-nums text-ink-subtle">{entry.range}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-5 flex min-h-[3lh] max-w-measure gap-3 text-sm text-ink-muted" aria-live="polite">
        <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: band.color }} aria-hidden="true" />
        <span>
          {spinning ? 'Fetching the current reading for Mumbai…' : (
            <><span className="font-medium text-ink">{band.name}, AQI {band.range}.</span> {band.impact}</>
          )}
        </span>
      </p>

      {mode === 'live' && reading ? (
        <div className="aqi-readout mt-5 grid gap-4 rounded-md border border-line bg-surface/60 p-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-6">
          <p className="flex items-baseline gap-2">
            <span className="font-display text-5xl font-semibold tabular-nums leading-none" style={{ color: band.color }}>{reading.aqi}</span>
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-subtle">AQI ≈<br />Mumbai now</span>
          </p>
          <div className="min-w-0">
            <dl className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs tabular-nums text-ink-muted">
              {(Object.keys(reading.values) as Array<keyof AirReading['values']>).map((key) => (
                <div key={key} className="flex gap-1.5">
                  <dt className={key === reading.dominant ? 'text-ink' : undefined}>{pollutantLabel[key]}</dt>
                  <dd>{reading.values[key].toFixed(0)} µg/m³</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-xs text-ink-subtle">
              Estimate from{' '}
              <a href={airQualitySource} className="text-cyan underline decoration-cyan/40 underline-offset-2 hover:decoration-cyan" target="_blank" rel="noreferrer">Open-Meteo</a>
              {' '}modelled hourly data (CC BY 4.0) using CPCB breakpoints, led by {pollutantLabel[reading.dominant]}. Official CPCB AQI uses 24-hour station averages.
            </p>
          </div>
        </div>
      ) : null}
      {mode === 'error' ? (
        <p className="mt-5 rounded-md border border-line bg-surface/60 p-4 text-sm text-ink-muted" role="status">
          The live air-quality feed is unavailable right now. The bands above still show the CPCB scale.
        </p>
      ) : null}
    </div>
  );
}
