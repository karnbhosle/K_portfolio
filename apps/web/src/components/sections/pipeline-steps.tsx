import type { PipelineStage } from '@karna/shared';
import { order } from '@/lib/style';

/**
 * Ordered stages. Phones get a compact numbered rail; wider screens a grid whose rules
 * draw in sequence on first view to show the order of work.
 */
export function PipelineSteps({ stages, accent }: { stages: PipelineStage[]; accent: 'cyan' | 'copper' }) {
  const rule = accent === 'copper' ? 'bg-copper' : 'bg-cyan';
  const node = accent === 'copper' ? 'border-copper-line text-copper' : 'border-cyan-line text-cyan';
  return (
    <ol className="grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-8 xl:grid-cols-3" data-reveal>
      {stages.map((stage, index) => (
        <li key={stage.title} style={order(index)} className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4 pb-6 last:pb-0 sm:block sm:pb-0 sm:pt-5">
          {/* Phone rail */}
          {index < stages.length - 1 ? (
            <span className="absolute bottom-0 left-4 top-8 w-px bg-line-strong sm:hidden" aria-hidden="true" />
          ) : null}
          <span className={`relative flex h-8 w-8 items-center justify-center rounded-full border bg-void font-mono text-xs tabular-nums sm:hidden ${node}`} aria-hidden="true">
            {index + 1}
          </span>
          {/* Grid rules */}
          <span className="absolute inset-x-0 top-0 hidden h-px bg-line-strong sm:block" aria-hidden="true" />
          <span className={`stage-rule absolute left-0 top-0 hidden h-px w-10 sm:block ${rule}`} aria-hidden="true" />

          <div className="pt-1 sm:pt-0">
            <p className="hidden font-mono text-xs tabular-nums text-ink-subtle sm:block">{String(index + 1).padStart(2, '0')}</p>
            <p className="font-display text-lg font-medium leading-snug text-ink sm:mt-2">
              <span className="sr-only">Stage {index + 1}: </span>{stage.title}
            </p>
            {stage.detail ? <p className="mt-1 text-sm text-ink-muted sm:mt-1.5">{stage.detail}</p> : null}
            {stage.tools.length ? (
              <ul className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-3" aria-label={`${stage.title} tools`}>
                {stage.tools.map((tool) => <li key={tool} className="chip">{tool}</li>)}
              </ul>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
