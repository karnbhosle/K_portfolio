import { ArcReactor } from './arc-reactor';

/**
 * The reactor stays pinned behind every section, offset toward the content's right edge so it
 * never sits under body copy. It turns slowly on desktop and holds still on phones and when paused.
 */
export function AmbientReactor() {
  return (
    <div className="ambient-reactor no-print pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute left-[78%] top-1/2 w-[min(150vw,46rem)] -translate-x-1/2 -translate-y-1/2 opacity-[0.11] md:left-[72%] lg:left-[calc(17rem_+_(100%_-_17rem)_*_0.74)] lg:w-[min(64vw,58rem)] lg:opacity-[0.14]"
        style={{ maskImage: 'radial-gradient(closest-side, #000 62%, transparent 100%)', WebkitMaskImage: 'radial-gradient(closest-side, #000 62%, transparent 100%)' }}
      >
        <ArcReactor id="ambient" />
      </div>
    </div>
  );
}
