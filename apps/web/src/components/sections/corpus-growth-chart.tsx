'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

/*
 * "Same money, three homes": one monthly amount invested from a starting age to 60, then left to grow
 * to 75 with no further contributions or withdrawals. The returns are assumptions the visitor can
 * change, not CorpusAI output. Colors are validated (all pairs, dark surface): magenta, blue, amber.
 */
type SeriesId = 'ai' | 'self' | 'fd';
const series: Array<{ id: SeriesId; name: string; short: string; color: string; rate: number; note: string }> = [
  { id: 'ai', name: 'AI-suggested mix', short: 'AI mix', color: '#D24FB4', rate: 11, note: 'An equity-led allocation like the ones a planning model suggests' },
  { id: 'self', name: 'Self-designed mix', short: 'Self mix', color: '#3987E5', rate: 9, note: 'A balanced portfolio someone puts together on their own' },
  { id: 'fd', name: 'Bank FD', short: 'Bank FD', color: '#C98500', rate: 6.5, note: 'Fixed deposits, renewed at the same rate' },
];
const INVESTED = '#71859A';
const RETIRE = 60;
const END = 75;
const INFLATION = 6;

type Row = { age: number; invested: number } & Record<SeriesId, number>;

function project(monthly: number, start: number, rates: Record<SeriesId, number>, real: boolean): Row[] {
  const pots: Record<SeriesId, number> = { ai: 0, self: 0, fd: 0 };
  let invested = 0;
  const rows: Row[] = [{ age: start, invested: 0, ai: 0, self: 0, fd: 0 }];
  for (let age = start; age < END; age += 1) {
    for (let month = 0; month < 12; month += 1) {
      const paying = age < RETIRE;
      if (paying) invested += monthly;
      for (const item of series) pots[item.id] = pots[item.id] * (1 + rates[item.id] / 100 / 12) + (paying ? monthly : 0);
    }
    const deflate = real ? (1 + INFLATION / 100) ** (age + 1 - start) : 1;
    rows.push({ age: age + 1, invested: invested / deflate, ai: pots.ai / deflate, self: pots.self / deflate, fd: pots.fd / deflate });
  }
  return rows;
}

/** Indian notation: crore, lakh, or plain rupees. */
export function rupees(value: number, digits = 2) {
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(value >= 1e9 ? 0 : digits)} Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(1)} L`;
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function niceMax(value: number) {
  const power = 10 ** Math.floor(Math.log10(value || 1));
  for (const step of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (step * power >= value) return step * power;
  return 10 * power;
}

export function CorpusGrowthChart() {
  const uid = useId();
  const [monthly, setMonthly] = useState(10000);
  const [start, setStart] = useState(25);
  const [real, setReal] = useState(false);
  const [rates, setRates] = useState<Record<SeriesId, number>>({ ai: 11, self: 9, fd: 6.5 });
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => { if (entry) setWidth(Math.max(280, entry.contentRect.width)); });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const rows = useMemo(() => project(monthly, start, rates, real), [monthly, start, rates, real]);
  const compact = width < 560;
  const height = compact ? 280 : 340;
  const margin = { top: 18, right: compact ? 14 : 132, bottom: 34, left: compact ? 52 : 64 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const top = niceMax(Math.max(...rows.map((row) => Math.max(row.ai, row.self, row.fd))));
  const x = (age: number) => margin.left + ((age - start) / (END - start)) * plotW;
  const y = (value: number) => margin.top + plotH - (value / top) * plotH;
  const path = (key: SeriesId | 'invested') => rows.map((row, index) => `${index ? 'L' : 'M'}${x(row.age).toFixed(1)},${y(row[key]).toFixed(1)}`).join('');
  const ticks = Array.from({ length: 5 }, (_, index) => (top / 4) * index);
  const ageTicks = Array.from({ length: END - start + 1 }, (_, index) => start + index).filter((age) => age % 5 === 0 || age === start);

  const last = rows[rows.length - 1]!;
  const atRetire = rows.find((row) => row.age === RETIRE)!;
  // Direct labels at the right edge, nudged apart so they never overlap.
  const labels = series.map((item) => ({ ...item, y: y(last[item.id]) })).sort((a, b) => a.y - b.y);
  for (let index = 1; index < labels.length; index += 1) labels[index]!.y = Math.max(labels[index]!.y, labels[index - 1]!.y + 30);
  const overflow = labels.length ? labels[labels.length - 1]!.y - (margin.top + plotH) : 0;
  if (overflow > 0) for (const label of labels) label.y -= overflow;

  const hovered = hover === null ? null : rows.find((row) => row.age === hover) ?? null;
  const pick = (clientX: number, element: SVGRectElement) => {
    const rect = element.getBoundingClientRect();
    const fraction = (clientX - rect.left) / rect.width;
    setHover(Math.round(start + Math.min(1, Math.max(0, fraction)) * (END - start)));
  };
  const onKey = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const from = hover ?? RETIRE;
    setHover(Math.min(END, Math.max(start, from + (event.key === 'ArrowRight' ? 1 : -1))));
  };

  const lead = last.ai - last.fd;

  return (
    <div className="viz-card rounded-lg border border-line bg-black/60 p-4 sm:p-6" data-reveal>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h4 className="label">Same money, three homes</h4>
          <p className="mt-2 font-display text-xl font-medium text-ink sm:text-2xl">
            {rupees(monthly)} a month from age {start} to 60, then left to grow until 75.
          </p>
        </div>
        <p className="text-sm text-ink-muted">
          At 75 the AI-suggested mix ends <span className="font-medium text-ink">{rupees(lead)}</span> ahead of the bank FD{real ? ', in today’s money' : ''}.
        </p>
      </div>

      {/* Controls, in one row above the chart */}
      <div className="mt-5 grid gap-4 border-y border-line py-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_auto]">
        <label className="block">
          <span className="flex justify-between font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ink-subtle">Monthly amount <span className="tabular-nums text-ink">{rupees(monthly)}</span></span>
          <input type="range" min={1000} max={50000} step={500} value={monthly} onChange={(event) => setMonthly(Number(event.target.value))} className="viz-range mt-2 w-full" />
        </label>
        <label className="block">
          <span className="flex justify-between font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ink-subtle">Start at age <span className="tabular-nums text-ink">{start}</span></span>
          <input type="range" min={20} max={45} step={1} value={start} onChange={(event) => { setStart(Number(event.target.value)); setHover(null); }} className="viz-range mt-2 w-full" />
        </label>
        <label className="flex items-center gap-2 self-end text-sm text-ink-muted">
          <input type="checkbox" checked={real} onChange={(event) => setReal(event.target.checked)} className="h-4 w-4 accent-[#D24FB4]" />
          In today’s money ({INFLATION}% inflation)
        </label>
      </div>

      {/* Legend: always present for several series; rates are editable assumptions. */}
      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3" aria-label="Series and assumed annual returns">
        {series.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-sm text-ink">
            <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
            <span title={item.note}>{item.name}</span>
            <label className="flex items-center gap-1 font-mono text-xs text-ink-subtle">
              <span className="sr-only">Assumed annual return for {item.name}, percent</span>
              <input
                type="number"
                min={1}
                max={15}
                step={0.5}
                value={rates[item.id]}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isFinite(value)) setRates((current) => ({ ...current, [item.id]: Math.min(15, Math.max(1, value)) }));
                }}
                className="w-14 rounded-sm border border-line-input bg-transparent px-1.5 py-0.5 text-right tabular-nums text-ink"
              />
              % a year
            </label>
          </li>
        ))}
        <li className="flex items-center gap-2 text-sm text-ink-muted">
          <span className="h-0 w-5 border-t border-dashed" style={{ borderColor: INVESTED }} aria-hidden="true" />
          Total put in
        </li>
      </ul>

      <div ref={box} className="relative mt-4">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="block max-w-full overflow-visible outline-none focus-visible:ring-2 focus-visible:ring-cyan/60"
          role="img"
          aria-labelledby={`${uid}-desc`}
          tabIndex={0}
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
        >
          <desc id={`${uid}-desc`}>
            Line chart of the corpus by age. At 60: AI-suggested mix {rupees(atRetire.ai)}, self-designed mix {rupees(atRetire.self)}, bank FD {rupees(atRetire.fd)}, from {rupees(atRetire.invested)} put in. At 75: {rupees(last.ai)}, {rupees(last.self)} and {rupees(last.fd)}.
          </desc>
          {/* After 60: growth only */}
          <rect x={x(RETIRE)} y={margin.top} width={x(END) - x(RETIRE)} height={plotH} fill="rgb(255 255 255 / 0.025)" />
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={margin.left} x2={margin.left + plotW} y1={y(tick)} y2={y(tick)} stroke="#16202B" />
              <text x={margin.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-ink-subtle font-mono text-[10px] tabular-nums">{tick ? rupees(tick, 1) : '₹0'}</text>
            </g>
          ))}
          {ageTicks.map((age) => (
            <text key={age} x={x(age)} y={height - 12} textAnchor="middle" className="fill-ink-subtle font-mono text-[10px] tabular-nums">{age}</text>
          ))}
          <text x={margin.left + plotW} y={height - 0} textAnchor="end" className="fill-ink-subtle font-mono text-[10px]">age</text>
          <line x1={x(RETIRE)} x2={x(RETIRE)} y1={margin.top} y2={margin.top + plotH} stroke="#71859A" strokeDasharray="3 4" />
          <text x={x(RETIRE) + (compact ? -6 : 6)} y={margin.top + 10} textAnchor={compact ? 'end' : 'start'} className="fill-ink-muted font-mono text-[10px]">{compact ? 'contributions stop at 60' : '60 · contributions stop'}</text>
          <line x1={margin.left} x2={margin.left + plotW} y1={margin.top + plotH} y2={margin.top + plotH} stroke="#22303F" />

          <path d={path('invested')} fill="none" stroke={INVESTED} strokeWidth="1.5" strokeDasharray="4 4" />
          {series.map((item) => (
            <path key={item.id} d={path(item.id)} fill="none" stroke={item.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className="viz-line" pathLength={1} />
          ))}
          {/* Markers at 60 and 75 only, ringed in the surface color */}
          {series.map((item) => [atRetire, last].map((row) => (
            <circle key={`${item.id}-${row.age}`} cx={x(row.age)} cy={y(row[item.id])} r="4.5" fill={item.color} stroke="#05080C" strokeWidth="2" />
          )))}
          {!compact ? labels.map((label) => (
            <g key={label.id}>
              <text x={margin.left + plotW + 12} y={label.y - 3} className="fill-ink text-[11px] font-medium">{label.short}</text>
              <text x={margin.left + plotW + 12} y={label.y + 11} className="fill-ink-muted font-mono text-[10px] tabular-nums">{rupees(last[label.id])}</text>
            </g>
          )) : null}

          {hovered ? (
            <g pointerEvents="none">
              <line x1={x(hovered.age)} x2={x(hovered.age)} y1={margin.top} y2={margin.top + plotH} stroke="#A3B3C2" strokeOpacity="0.5" />
              {series.map((item) => <circle key={item.id} cx={x(hovered.age)} cy={y(hovered[item.id])} r="4.5" fill={item.color} stroke="#05080C" strokeWidth="2" />)}
            </g>
          ) : null}
          <rect
            x={margin.left}
            y={margin.top}
            width={plotW}
            height={plotH}
            fill="transparent"
            onPointerMove={(event: PointerEvent<SVGRectElement>) => pick(event.clientX, event.currentTarget)}
            onPointerDown={(event: PointerEvent<SVGRectElement>) => pick(event.clientX, event.currentTarget)}
            onPointerLeave={() => setHover(null)}
          />
        </svg>

        {hovered ? (
          <div
            className="viz-tip pointer-events-none absolute top-2 z-10 w-56 rounded-md border border-line-strong bg-surface-overlay/95 p-3 text-sm shadow-lg backdrop-blur"
            style={{ left: Math.min(width - 232, Math.max(0, x(hovered.age) + (x(hovered.age) > width / 2 ? -236 : 12))) }}
            role="status"
          >
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ink-subtle">Age {hovered.age}{hovered.age > RETIRE ? ' · growth only' : ''}</p>
            <dl className="mt-2 space-y-1">
              {[...series].sort((a, b) => hovered[b.id] - hovered[a.id]).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-ink-muted"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />{item.short}</dt>
                  <dd className="tabular-nums text-ink">{rupees(hovered[item.id])}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 border-t border-line pt-1">
                <dt className="text-ink-subtle">Put in</dt>
                <dd className="tabular-nums text-ink-muted">{rupees(hovered.invested)}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </div>
      <p className="mt-1 font-mono text-[0.6875rem] text-ink-subtle">Hover or focus the chart and use ← → to read any age.</p>

      <details className="group mt-4">
        <summary className="cursor-pointer text-sm text-ink-muted hover:text-ink">Show as a table</summary>
        <div className="mt-3">
          <table className="w-full text-left text-xs tabular-nums sm:text-sm">
            <thead className="font-mono text-[0.625rem] uppercase tracking-[0.06em] text-ink-subtle">
              <tr><th className="py-2 pr-3 font-normal">Age</th><th className="py-2 pr-3 font-normal">Put in</th>{series.map((item) => <th key={item.id} className="py-2 pr-3 font-normal">{item.short} · {rates[item.id]}%</th>)}</tr>
            </thead>
            <tbody>
              {rows.filter((row) => row.age === start || row.age % 10 === 0 || row.age === RETIRE || row.age === 65 || row.age === END).map((row) => (
                <tr key={row.age} className="border-t border-line text-ink-muted">
                  <td className="py-2 pr-3 text-ink">{row.age}</td>
                  <td className="py-2 pr-3">{rupees(row.invested)}</td>
                  {series.map((item) => <td key={item.id} className="py-2 pr-3 text-ink">{rupees(row[item.id])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <p className="mt-4 max-w-measure text-xs text-ink-subtle">
        Illustrative only. The returns are assumed constant yearly rates, compounded monthly and before tax; change them above.
        They are not CorpusAI’s model output and not financial advice, and real returns vary and are not guaranteed.
        No withdrawals are modelled after 60.
      </p>
    </div>
  );
}
