'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { airQualitySource, fetchMetroAir, metroCities, pollutantLabel, type CityAir, type CityPoint } from '@/lib/air-quality';
import { bandFor, cpcb } from './arcade-games';

/*
 * The five metros in AeroSense's dataset, live. One bar chart compares the AQI right now; five small
 * multiples (one city each, one shared scale) show the last hours and the model forecast ahead.
 * Five lines on one plot can't keep distinct, colour-blind-safe colours, so each city gets a panel.
 * Bars are coloured by CPCB band and always carry the band name, so colour is never the only cue.
 */
type Status = 'idle' | 'loading' | 'ready' | 'error';
const LINE = '#61E8FF';
const VIEW_W = 240;
const VIEW_H = 120;

const clock = (point: CityPoint) => point.time.slice(11, 16);
function when(points: CityPoint[], index: number) {
  const point = points[index];
  if (!point) return '';
  return `${point.time.slice(0, 10) === points[0]!.time.slice(0, 10) ? 'Today' : 'Tomorrow'} ${clock(point)}`;
}
const placeholder: CityAir[] = metroCities.map((city) => ({
  id: city.id,
  name: city.name,
  now: 0,
  points: Array.from({ length: 48 }, () => ({ time: '', aqi: 0, dominant: 'pm2_5' as const, values: { pm2_5: 0, pm10: 0, nitrogen_dioxide: 0 } })),
}));
const scaleTop = (value: number) => [100, 150, 200, 300, 400, 500].find((step) => step >= value) ?? 500;

export function CityAirChart() {
  const root = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [cities, setCities] = useState<CityAir[]>([]);
  const [hover, setHover] = useState<number | null>(null);

  const load = () => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    setStatus('loading');
    fetchMetroAir(controller.signal)
      .then((data) => { setCities(data); setStatus('ready'); })
      .catch(() => { if (abort.current === controller) setStatus('error'); })
      .finally(() => window.clearTimeout(timeout));
  };

  // Fetch once the section comes near the viewport, not on page load.
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; });
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      loadRef.current();
    }, { rootMargin: '300px' });
    observer.observe(element);
    return () => { observer.disconnect(); abort.current?.abort(); abort.current = null; };
  }, []);

  // Until the data lands, the same layout renders with blank values, so the page never shifts.
  const pending = status !== 'ready';
  const shown = pending ? placeholder : cities;
  const ranked = shown.map((city) => ({ city, point: city.points[city.now]! })).sort((a, b) => b.point.aqi - a.point.aqi);
  const barTop = scaleTop(Math.max(200, ...ranked.map((item) => item.point.aqi)));
  const top = scaleTop(Math.max(150, ...shown.flatMap((city) => city.points.map((point) => point.aqi))));
  const sample = shown[0];

  return (
    <div ref={root} className="viz-card rounded-lg border border-line bg-black/60 p-4 sm:p-6" data-reveal data-air={status}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h4 className="label flex items-center gap-2">
            <span className={`status-led h-1.5 w-1.5 rounded-full bg-cyan ${status === 'loading' ? 'is-busy' : ''}`} aria-hidden="true" />
            Five metros, live
          </h4>
          <p className="mt-2 font-display text-xl font-medium text-ink sm:text-2xl">The cities AeroSense was built around, right now and over the next day.</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={status === 'loading'}
          className="inline-flex h-9 items-center gap-2 rounded-sm border border-cyan-line px-3 font-mono text-xs font-medium uppercase tracking-[0.08em] text-cyan transition-colors duration-fast hover:bg-white/5 disabled:opacity-70"
        >
          {status === 'loading' ? 'Reading…' : status === 'ready' ? 'Refresh' : 'Read now'}
        </button>
      </div>

      {status === 'error' ? (
        <p className="mt-6 rounded-md border border-line bg-surface/60 p-4 text-sm text-ink-muted" role="status">
          The live air-quality feed is unavailable right now. Try again in a moment.
        </p>
      ) : null}

      {sample && status !== 'error' ? (
        <div aria-busy={pending}>
          {/* Right now: one bar per city, coloured by its CPCB band */}
          <section className="mt-6" aria-label="AQI right now by city">
            <h5 className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ink-subtle">AQI now{pending ? '' : ` · ${when(sample.points, sample.now)} IST`}</h5>
            <ul className="mt-3 space-y-2">
              {ranked.map(({ city, point }) => {
                const band = bandFor(point.aqi);
                return (
                  <li key={city.id} className="group relative grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 sm:grid-cols-[6.5rem_minmax(0,1fr)_14rem]" tabIndex={0}>
                    <span className="text-sm text-ink">{city.name}</span>
                    <span className="relative h-7">
                      {cpcb.filter((entry) => entry.high < barTop).map((entry) => (
                        <span key={entry.name} className="absolute inset-y-0 w-px bg-white/[0.06]" style={{ left: `${(entry.high / barTop) * 100}%` }} aria-hidden="true" />
                      ))}
                      <span
                        className={`${pending ? 'viz-skeleton' : 'viz-bar'} absolute inset-y-1.5 left-0 rounded-r-[4px]`}
                        style={pending ? { width: '100%', backgroundColor: 'rgb(255 255 255 / 0.04)' } : { width: `${Math.max(1.5, (point.aqi / barTop) * 100)}%`, backgroundColor: band.color, boxShadow: `0 0 14px ${band.color}55` }}
                        aria-hidden="true"
                      />
                    </span>
                    <span className="col-start-2 font-mono text-xs tabular-nums text-ink-muted sm:col-start-auto">
                      {pending ? 'Reading…' : <><span className="text-ink">{point.aqi}</span> · {band.name} · {pollutantLabel[point.dominant]}</>}
                    </span>
                    {pending ? null : <span className="viz-tip pointer-events-none absolute left-[6.5rem] top-full z-10 mt-1 hidden w-64 rounded-md border border-line-strong bg-surface-overlay/95 p-3 text-xs text-ink-muted shadow-lg backdrop-blur group-hover:block group-focus-visible:block" role="tooltip">
                      <span className="block font-medium text-ink">{city.name}: AQI {point.aqi}, {band.name}</span>
                      <span className="mt-1 block tabular-nums">
                        24-hour means: {(Object.keys(point.values) as Array<keyof CityPoint['values']>).map((key) => `${pollutantLabel[key]} ${point.values[key].toFixed(0)}`).join(' · ')} µg/m³
                      </span>
                      <span className="mt-1 block">Led by {pollutantLabel[point.dominant]}.</span>
                    </span>}
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[6.5rem_minmax(0,1fr)_14rem]" aria-hidden="true">
              <span />
              <span className="relative h-4 font-mono text-[10px] tabular-nums text-ink-subtle">
                {[0, ...cpcb.filter((entry) => entry.high < barTop).map((entry) => entry.high), barTop].map((tick) => (
                  <span key={tick} className="absolute -translate-x-1/2" style={{ left: `${(tick / barTop) * 100}%` }}>{tick}</span>
                ))}
              </span>
            </div>
          </section>

          {/* Next hours: small multiples on one shared scale, with a shared crosshair */}
          <section className="mt-8" aria-label="AQI over today and tomorrow, by city">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h5 className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ink-subtle">Today and tomorrow · solid is past, dashed is forecast</h5>
              <p className="font-mono text-[0.6875rem] text-ink-subtle">Hover or focus a panel and use ← → to read an hour.</p>
            </div>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {shown.map((city) => <CityPanel key={city.id} city={city} top={top} hover={pending ? null : hover} onHover={pending ? () => {} : setHover} pending={pending} />)}
            </ul>
          </section>

          {pending ? null : <details className="mt-5">
            <summary className="cursor-pointer text-sm text-ink-muted hover:text-ink">Show as a table</summary>
            <div className="mt-3">
              <table className="w-full text-left text-xs tabular-nums sm:text-sm">
                <thead className="font-mono text-[0.625rem] uppercase tracking-[0.06em] text-ink-subtle">
                  <tr><th className="py-2 pr-3 font-normal">City</th><th className="py-2 pr-3 font-normal">Now</th><th className="py-2 pr-3 font-normal">Band</th><th className="py-2 pr-3 font-normal">24 h high</th><th className="py-2 font-normal">24 h low</th></tr>
                </thead>
                <tbody>
                  {cities.map((city) => {
                    const ahead = city.points.slice(city.now, city.now + 25);
                    const high = ahead.reduce((best, point) => (point.aqi > best.aqi ? point : best), ahead[0]!);
                    const low = ahead.reduce((best, point) => (point.aqi < best.aqi ? point : best), ahead[0]!);
                    const now = city.points[city.now]!;
                    return (
                      <tr key={city.id} className="border-t border-line text-ink-muted">
                        <td className="py-2 pr-3 text-ink">{city.name}</td>
                        <td className="py-2 pr-3 text-ink">{now.aqi}</td>
                        <td className="py-2 pr-3">{bandFor(now.aqi).name}</td>
                        <td className="py-2 pr-3">{high.aqi} · {when(city.points, city.points.indexOf(high))}</td>
                        <td className="py-2">{low.aqi} · {when(city.points, city.points.indexOf(low))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>}
        </div>
      ) : null}

      <p className="mt-5 max-w-measure text-xs text-ink-subtle">
        Estimates from{' '}
        <a href={airQualitySource} className="text-cyan underline decoration-cyan/40 underline-offset-2 hover:decoration-cyan" target="_blank" rel="noreferrer">Open-Meteo</a>
        {' '}modelled data (CC BY 4.0), scored with CPCB breakpoints on trailing 24-hour means of PM2.5, PM10 and NO₂. The dashed lines are
        Open-Meteo’s model forecast, shown to illustrate a prediction view; they are not output from AeroSense’s Random Forest. Official CPCB AQI comes from ground stations.
      </p>
    </div>
  );
}

function CityPanel({ city, top, hover, onHover, pending }: { city: CityAir; top: number; hover: number | null; onHover: (index: number | null) => void; pending: boolean }) {
  const { points, now } = city;
  const last = points.length - 1;
  const at = hover === null ? now : Math.min(last, hover);
  const point = points[at]!;
  const band = bandFor(point.aqi);
  const x = (index: number) => (index / Math.max(1, last)) * VIEW_W;
  const y = (aqi: number) => VIEW_H - (Math.min(aqi, top) / top) * VIEW_H;
  const line = (from: number, to: number) => points.slice(from, to + 1).map((item, offset) => `${offset ? 'L' : 'M'}${x(from + offset).toFixed(2)},${y(item.aqi).toFixed(2)}`).join('');
  const midnight = points.findIndex((item, index) => index > 0 && item.time.endsWith('T00:00'));
  const ahead = points.slice(now, now + 25);
  const peak = ahead.reduce((best, item) => (item.aqi > best.aqi ? item : best), ahead[0]!);

  const pick = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onHover(Math.round(Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)) * last));
  };
  const onKey = (event: KeyboardEvent<HTMLLIElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    onHover(Math.min(last, Math.max(0, at + (event.key === 'ArrowRight' ? 1 : -1))));
  };

  return (
    <li
      className="rounded-md border border-line bg-surface/50 p-3 outline-none focus-visible:ring-2 focus-visible:ring-cyan/60"
      tabIndex={pending ? undefined : 0}
      onKeyDown={onKey}
      onBlur={() => onHover(null)}
      aria-label={pending ? `${city.name}: reading…` : `${city.name}: AQI ${point.aqi}, ${band.name}, ${hover === null ? 'now' : when(points, at)}. Next 24 hours peak ${peak.aqi} at ${when(points, points.indexOf(peak))}.`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-ink">{city.name}</span>
        <span className="font-mono text-[0.6875rem] text-ink-subtle">{pending ? '' : hover === null ? 'Now' : when(points, at)}</span>
      </div>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-3xl font-semibold tabular-nums leading-none text-ink">{pending ? '—' : point.aqi}</span>
        {pending ? null : <span className="flex items-center gap-1.5 text-xs text-ink-muted"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: band.color }} aria-hidden="true" />{band.name}</span>}
      </p>
      <div className="relative mt-3 h-24 touch-none" onPointerMove={pick} onPointerDown={pick} onPointerLeave={() => onHover(null)}>
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          {cpcb.map((entry, index) => {
            const low = index ? cpcb[index - 1]!.high : 0;
            if (low >= top) return null;
            return <rect key={entry.name} x="0" width={VIEW_W} y={y(entry.high)} height={y(low) - y(entry.high)} fill={entry.color} opacity="0.07" />;
          })}
          {cpcb.filter((entry) => entry.high < top).map((entry) => (
            <line key={entry.name} x1="0" x2={VIEW_W} y1={y(entry.high)} y2={y(entry.high)} stroke="rgb(255 255 255 / 0.06)" vectorEffect="non-scaling-stroke" />
          ))}
          {midnight > 0 ? <line x1={x(midnight)} x2={x(midnight)} y1="0" y2={VIEW_H} stroke="rgb(255 255 255 / 0.1)" vectorEffect="non-scaling-stroke" /> : null}
          {pending ? null : <>
          <rect x={x(now)} y="0" width={VIEW_W - x(now)} height={VIEW_H} fill="rgb(97 232 255 / 0.04)" />
          <path d={line(0, now)} fill="none" stroke={LINE} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <path d={line(now, last)} fill="none" stroke={LINE} strokeWidth="2" strokeDasharray="4 3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity="0.85" />
          <line x1={x(now)} x2={x(now)} y1="0" y2={VIEW_H} stroke="#A3B3C2" strokeOpacity="0.45" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
          {/* A zero-length round-capped line stays a circle when the plot stretches. */}
          <line x1={x(now)} x2={x(now)} y1={y(points[now]!.aqi)} y2={y(points[now]!.aqi)} stroke="#05080C" strokeWidth="11" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <line x1={x(now)} x2={x(now)} y1={y(points[now]!.aqi)} y2={y(points[now]!.aqi)} stroke={LINE} strokeWidth="8" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </>}
          {hover !== null ? (
            <>
              <line x1={x(at)} x2={x(at)} y1="0" y2={VIEW_H} stroke="#E8F0F7" strokeOpacity="0.55" vectorEffect="non-scaling-stroke" />
              <line x1={x(at)} x2={x(at)} y1={y(point.aqi)} y2={y(point.aqi)} stroke="#05080C" strokeWidth="11" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <line x1={x(at)} x2={x(at)} y1={y(point.aqi)} y2={y(point.aqi)} stroke={band.color} strokeWidth="8" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </>
          ) : null}
        </svg>
        <span className="absolute -left-0.5 -top-1 font-mono text-[9px] tabular-nums text-ink-subtle" aria-hidden="true">{top}</span>
      </div>
      <div className="relative mt-1 h-3 font-mono text-[9px] text-ink-subtle" aria-hidden="true">
        <span className="absolute left-0">Today</span>
        {midnight > 0 ? <span className="absolute -translate-x-1/2" style={{ left: `${(midnight / last) * 100}%` }}>Tomorrow</span> : null}
      </div>
      <p className="mt-2 text-xs text-ink-muted">{pending ? 'Reading the forecast…' : <>Next 24 h peak <span className="tabular-nums text-ink">{peak.aqi}</span> at {when(points, points.indexOf(peak))}</>}</p>
    </li>
  );
}
