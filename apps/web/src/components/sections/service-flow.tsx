'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { getMotion } from '@/lib/preferences';

type Accent = 'cyan' | 'copper';
type NodeId = 'client' | 'gateway' | 'inference' | 'storage';
type EdgeId = 'requests' | 'inference' | 'persists';

interface Step { node?: NodeId; edge?: EdgeId; reverse?: boolean; log?: string }

const kickers: Record<NodeId, string> = { client: 'Client', gateway: 'Gateway', inference: 'Inference', storage: 'Storage' };
const STEP_MS = 520;

/**
 * The service topology every project shares: client → gateway → inference, with the gateway
 * persisting to the database. Visitors can inspect any component or trace a request through it.
 * The trace is an illustration of the documented topology, not a recording of real traffic.
 */
export function ServiceFlow({ nodes, database, note, accent }: { nodes: string[]; database: string; note: string; accent: Accent }) {
  const [clientName, gatewayName, inferenceName] = nodes as [string, string, string | undefined];
  const names: Record<NodeId, string> = { client: clientName, gateway: gatewayName, inference: inferenceName ?? '', storage: database };
  const [hover, setHover] = useState<NodeId | null>(null);
  const [selected, setSelected] = useState<NodeId | null>(null);
  const [step, setStep] = useState(-1);
  const [log, setLog] = useState<string[]>([]);
  const timers = useRef<number[]>([]);

  const steps: Step[] = [
    { node: 'client', log: `${clientName} sends a request` },
    { edge: 'requests' },
    { node: 'gateway', log: `${gatewayName} receives it` },
    ...(inferenceName
      ? [
        { edge: 'inference' as const },
        { node: 'inference' as const, log: `${inferenceName} runs inference` },
        { edge: 'inference' as const, reverse: true },
        { node: 'gateway' as const, log: 'Result returns to the gateway' },
      ]
      : []),
    { edge: 'persists' },
    { node: 'storage', log: `${database} persists the result` },
  ];

  const tracing = step >= 0 && step < steps.length;
  const current = tracing ? steps[step] : undefined;
  const visited = new Set(steps.slice(0, Math.max(0, step + 1)).map((entry) => entry.node).filter(Boolean));

  const clear = () => { timers.current.forEach((timer) => window.clearTimeout(timer)); timers.current = []; };
  useEffect(() => clear, []);

  function trace() {
    clear();
    setSelected(null);
    setLog(['$ trace --request']);
    const pace = getMotion() === 'on' ? STEP_MS : 120;
    steps.forEach((entry, index) => {
      timers.current.push(window.setTimeout(() => {
        setStep(index);
        if (entry.log) setLog((lines) => [...lines, `› ${entry.log}`]);
      }, index * pace));
    });
    timers.current.push(window.setTimeout(() => {
      setStep(steps.length);
      setLog((lines) => [...lines, `✓ Round trip complete · ${steps.filter((entry) => entry.node).length} hops`]);
    }, steps.length * pace));
  }

  const links: Record<NodeId, string[]> = {
    client: [`→ requests → ${gatewayName}`],
    gateway: [`← requests ← ${clientName}`, ...(inferenceName ? [`→ inference → ${inferenceName}`] : []), `↓ persists → ${database}`],
    inference: inferenceName ? [`← inference ← ${gatewayName}`, `→ returns results to ${gatewayName}`] : [],
    storage: [`← persists ← ${gatewayName}`],
  };
  const edgesOf: Record<NodeId, EdgeId[]> = {
    client: ['requests'],
    gateway: ['requests', 'inference', 'persists'],
    inference: ['inference'],
    storage: ['persists'],
  };
  const focus = hover ?? selected;
  const hotEdges = new Set(focus ? edgesOf[focus] : []);

  const nodeProps = (id: NodeId) => ({
    id,
    kicker: kickers[id],
    name: names[id],
    accent,
    state: current?.node === id ? 'active' as const : tracing && visited.has(id) ? 'visited' as const : step === steps.length && visited.has(id) ? 'done' as const : null,
    selected: selected === id,
    dimmed: Boolean(focus) && focus !== id && !(focus && edgesOf[focus].some((edge) => edgesOf[id].includes(edge))),
    onEnter: () => setHover(id),
    onLeave: () => setHover((value) => (value === id ? null : value)),
    onSelect: () => setSelected((value) => (value === id ? null : id)),
  });

  const edgeProps = (id: EdgeId) => ({
    hot: hotEdges.has(id),
    trace: current?.edge === id ? (current.reverse ? 'reverse' as const : 'forward' as const) : null,
    traceKey: step,
  });

  const readout = selected
    ? [`${kickers[selected]} · ${names[selected]}`, ...links[selected]]
    : log.length
      ? log
      : ['Select a component to inspect it, or trace a request through the system.'];

  return (
    <figure className="blueprint @container" data-loop data-accent={accent}>
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 sm:px-6">
        <p className="label flex items-center gap-2"><span className="status-led h-1.5 w-1.5 rounded-full bg-cyan" aria-hidden="true" /> System topology</p>
        <div className="flex items-center gap-3">
          <p className="hidden font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-subtle sm:block">{nodes.length + 1} components</p>
          <button type="button" onClick={trace} disabled={tracing} className="trace-button inline-flex h-9 items-center gap-2 rounded-sm border border-cyan-line bg-cyan-soft px-3 font-mono text-xs font-medium uppercase tracking-[0.08em] text-cyan transition-colors duration-fast hover:bg-cyan hover:text-cyan-deep disabled:opacity-70">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className={`absolute inset-0 rounded-full bg-current ${tracing ? 'animate-ping' : ''}`} />
              <span className="relative h-2 w-2 rounded-full bg-current" />
            </span>
            {tracing ? 'Tracing…' : step === steps.length ? 'Trace again' : 'Trace a request'}
          </button>
        </div>
      </div>

      <div className="relative z-10 px-5 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-x-3 @2xl:grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)_4.5rem_minmax(0,1fr)] @2xl:gap-x-0">
          <Node {...nodeProps('client')} order={0} className="col-span-2 row-start-1 @2xl:col-span-1 @2xl:col-start-1" />
          <Edge label="requests" delay={0} {...edgeProps('requests')} className="col-span-2 row-start-2 @2xl:col-span-1 @2xl:col-start-2 @2xl:row-start-1" />
          <Node {...nodeProps('gateway')} order={1} primary className="col-span-2 row-start-3 @2xl:col-span-1 @2xl:col-start-3 @2xl:row-start-1" />
          {inferenceName ? (
            <>
              <Edge label="inference" delay={800} {...edgeProps('inference')} className="col-start-1 row-start-4 @2xl:col-start-4 @2xl:row-start-1" />
              <Node {...nodeProps('inference')} order={2} className="col-start-1 row-start-5 @2xl:col-start-5 @2xl:row-start-1" />
            </>
          ) : null}
          <Edge label="persists" delay={1200} tone="accent" fixedVertical {...edgeProps('persists')} className={`${inferenceName ? 'col-start-2' : 'col-span-2'} row-start-4 @2xl:col-span-1 @2xl:col-start-3 @2xl:row-start-2`} />
          <Node {...nodeProps('storage')} order={3} className={`${inferenceName ? 'col-start-2' : 'col-span-2'} row-start-5 @2xl:col-span-1 @2xl:col-start-3 @2xl:row-start-3`} />
        </div>
      </div>

      {/* Console readout */}
      <div className="relative z-10 border-t border-line bg-black/70 px-5 py-4 font-mono text-xs sm:px-6">
        <div role="log" aria-label="Topology readout" aria-live="polite" className="min-h-[4.5rem] space-y-1 text-ink-muted">
          {readout.map((line, index) => (
            <p key={`${line}-${index}`} className={`console-line ${index === 0 && selected ? 'text-ink' : ''} ${line.startsWith('✓') ? 'text-cyan' : ''}`}>{line}</p>
          ))}
        </div>
      </div>
      <figcaption className="relative z-10 border-t border-line px-5 py-3.5 text-caption text-ink-muted sm:px-6">
        {note} <span className="text-ink-subtle">The trace illustrates this topology; it is not live traffic.</span>
      </figcaption>
    </figure>
  );
}

function Node({ id, kicker, name, className, accent, primary, state, selected, dimmed, order, onEnter, onLeave, onSelect }: {
  id: NodeId; kicker: string; name: string; className: string; accent: Accent; primary?: boolean;
  state: 'active' | 'visited' | 'done' | null; selected: boolean; dimmed: boolean; order: number;
  onEnter: () => void; onLeave: () => void; onSelect: () => void;
}) {
  const tone = accent === 'copper' ? 'text-copper' : 'text-cyan';
  const lit = state === 'active' || selected;
  return (
    <button
      type="button"
      data-node={id}
      data-state={state ?? undefined}
      aria-pressed={selected}
      aria-label={`${kicker}: ${name}`}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onClick={onSelect}
      style={{ '--i': order } as CSSProperties}
      className={`node-boot topo-node group relative z-10 rounded-md border bg-black/85 px-4 py-3.5 text-left backdrop-blur-sm transition-[border-color,box-shadow,opacity,transform] duration-base ease-out hover:-translate-y-0.5 ${
        lit ? (accent === 'copper' ? 'border-copper shadow-[0_0_36px_-6px_rgba(201,138,69,0.9)]' : 'border-cyan shadow-[0_0_36px_-6px_rgba(97,232,255,0.9)]')
          : primary ? (accent === 'copper' ? 'border-copper-line shadow-[0_0_32px_-10px_rgba(201,138,69,0.7)]' : 'border-cyan-line shadow-[0_0_32px_-10px_rgba(97,232,255,0.7)]')
            : state ? 'border-cyan-line' : 'border-line-strong'
      } ${dimmed ? 'opacity-45' : 'opacity-100'} ${className}`}
    >
      <span className="node-scan pointer-events-none absolute inset-0 overflow-hidden rounded-md" aria-hidden="true" />
      <span className="flex items-center justify-between gap-3">
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ink-subtle">{kicker}</span>
        <span className={`node-led h-1.5 w-1.5 rounded-full bg-current ${lit || primary || state ? `${tone} status-led` : 'text-ink-subtle'}`} aria-hidden="true" />
      </span>
      <span className="mt-1.5 block font-medium leading-snug text-ink">{name}</span>
      {state === 'done' || state === 'visited' ? <span className={`absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[0.625rem] ${tone} ring-1 ring-current`} aria-hidden="true">✓</span> : null}
    </button>
  );
}

/**
 * An edge that runs vertically in the narrow tree and horizontally in the wide row.
 * `fixedVertical` edges (gateway → database) stay vertical at every width.
 */
function Edge({ label, className, delay, fixedVertical, tone, hot, trace, traceKey }: {
  label: string; className: string; delay: number; fixedVertical?: boolean; tone?: 'accent'; hot: boolean; trace: 'forward' | 'reverse' | null; traceKey: number;
}) {
  const pulse = { '--delay': `${delay}ms` } as CSSProperties;
  const wire = (axis: 'x' | 'y', extra: string) => (
    <div className={`wire ${extra}`} data-axis={axis} data-hot={hot || trace ? '' : undefined} aria-hidden="true">
      <span className="wire-packet" data-tone={tone} style={pulse} />
      {trace ? <span key={traceKey} className="trace-packet" data-dir={trace} /> : null}
    </div>
  );
  return (
    <div className={`relative flex items-center justify-center ${fixedVertical ? 'h-14' : 'h-14 @2xl:h-auto'} ${className}`}>
      {wire('y', `h-full w-px ${fixedVertical ? '' : '@2xl:hidden'}`)}
      {fixedVertical ? null : wire('x', 'hidden h-px w-full @2xl:block')}
      <span
        className={`absolute whitespace-nowrap font-mono text-[0.6875rem] transition-colors duration-base ${hot || trace ? 'text-cyan' : 'text-ink-subtle'} ${
          fixedVertical ? 'left-[calc(50%+0.625rem)]' : 'left-[calc(50%+0.625rem)] @2xl:-top-1 @2xl:left-1/2 @2xl:-translate-x-1/2 @2xl:-translate-y-full'
        }`}
      >
        {label}
      </span>
    </div>
  );
}
