import type { CSSProperties } from 'react';

type Accent = 'cyan' | 'copper';

const kickers = ['Client', 'Gateway', 'Inference'];

function Node({ kicker, name, className, accent }: { kicker: string; name: string; className: string; accent?: Accent }) {
  const border = accent === 'copper' ? 'border-copper-line' : accent === 'cyan' ? 'border-cyan-line' : 'border-line-strong';
  return (
    <div className={`rounded-md border ${border} bg-void px-4 py-3.5 ${className}`}>
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-subtle">{kicker}</p>
      <p className="mt-1 font-medium leading-snug text-ink">{name}</p>
    </div>
  );
}

/**
 * An edge that runs vertically in the narrow tree and horizontally in the wide row.
 * `fixedVertical` edges (gateway → database) stay vertical at every width.
 */
function Edge({ label, className, delay, fixedVertical }: { label: string; className: string; delay: number; fixedVertical?: boolean }) {
  const pulse = { '--delay': `${delay}ms` } as CSSProperties;
  return (
    <div className={`relative flex items-center justify-center ${fixedVertical ? 'h-12' : 'h-12 @2xl:h-auto'} ${className}`}>
      {/* Vertical line */}
      <div className={`relative h-full w-px overflow-hidden bg-line-strong ${fixedVertical ? '' : '@2xl:hidden'}`} aria-hidden="true">
        <span className="flow-pulse" data-axis="y" style={pulse} />
      </div>
      {/* Horizontal line */}
      {fixedVertical ? null : (
        <div className="relative hidden h-px w-full overflow-hidden bg-line-strong @2xl:block" aria-hidden="true">
          <span className="flow-pulse" data-axis="x" style={pulse} />
        </div>
      )}
      <span
        className={`absolute whitespace-nowrap font-mono text-[0.6875rem] text-ink-subtle ${
          fixedVertical ? 'left-[calc(50%+0.625rem)]' : 'left-[calc(50%+0.625rem)] @2xl:-top-1 @2xl:left-1/2 @2xl:-translate-x-1/2 @2xl:-translate-y-full'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

/** The service topology every project shares: client → gateway → inference, with the gateway persisting to the database. */
export function ServiceFlow({ nodes, database, note, accent }: { nodes: string[]; database: string; note: string; accent: Accent }) {
  const [client, gateway, inference] = nodes;
  return (
    <figure className="@container">
      <div className="grid grid-cols-2 gap-x-3 @2xl:grid-cols-[minmax(0,1fr)_3.5rem_minmax(0,1fr)_3.5rem_minmax(0,1fr)] @2xl:gap-x-0" data-reveal>
        <Node kicker={kickers[0]!} name={client!} className="col-span-2 row-start-1 @2xl:col-span-1 @2xl:col-start-1" />
        <Edge label="requests" delay={0} className="col-span-2 row-start-2 @2xl:col-span-1 @2xl:col-start-2 @2xl:row-start-1" />
        <Node kicker={kickers[1]!} name={gateway!} accent={accent} className="col-span-2 row-start-3 @2xl:col-span-1 @2xl:col-start-3 @2xl:row-start-1" />
        {inference ? (
          <>
            <Edge label="inference" delay={1100} className="col-start-1 row-start-4 @2xl:col-start-4 @2xl:row-start-1" />
            <Node kicker={kickers[2]!} name={inference} className="col-start-1 row-start-5 @2xl:col-start-5 @2xl:row-start-1" />
          </>
        ) : null}
        <Edge label="persists" delay={1100} fixedVertical className={`${inference ? 'col-start-2' : 'col-span-2'} row-start-4 @2xl:col-span-1 @2xl:col-start-3 @2xl:row-start-2`} />
        <Node kicker="Storage" name={database} className={`${inference ? 'col-start-2' : 'col-span-2'} row-start-5 @2xl:col-span-1 @2xl:col-start-3 @2xl:row-start-3`} />
      </div>
      <figcaption className="mt-4 text-caption text-ink-subtle">{note}</figcaption>
    </figure>
  );
}
