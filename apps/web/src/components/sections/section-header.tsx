import type { ReactNode } from 'react';
import { sections } from '@/lib/sections';
import { ScrambleText } from '@/components/ui/scramble-text';

/**
 * Sections are indexed 01–06 to match the navigation: an index rail that draws in,
 * an oversized title, and a short lede set to the right on wide screens.
 */
export function SectionHeader({ index, title, id, children }: { index: string; title: ReactNode; id: string; children?: ReactNode }) {
  return (
    <header className="mb-14 sm:mb-20" data-reveal>
      <p className="flex items-center gap-4 font-mono text-xs uppercase tracking-[0.12em] text-ink-subtle" aria-hidden="true">
        <span><span className="text-cyan">{index}</span> / {String(sections.length).padStart(2, '0')}</span>
        <span className="draw-x h-px flex-1 bg-gradient-to-r from-line-strong to-transparent" />
      </p>
      <div className="mt-8 grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-12">
        <h2 id={`${id}-title`} className="cursor-default text-section font-semibold lg:col-span-7">{typeof title === 'string' ? <ScrambleText text={title} /> : title}</h2>
        {children ? <div className="max-w-measure text-body-lg text-ink-muted lg:col-span-5 lg:pb-2">{children}</div> : null}
      </div>
    </header>
  );
}
