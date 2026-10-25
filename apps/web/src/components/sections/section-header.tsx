import type { ReactNode } from 'react';

/**
 * Sections are indexed 01–06 to match the navigation, an intentional editorial system
 * rather than a decorative eyebrow repeated for rhythm.
 */
export function SectionHeader({ index, title, id, children }: { index: string; title: string; id: string; children?: ReactNode }) {
  return (
    <header className="mb-10 grid gap-4 border-t border-line pt-6 sm:mb-14 md:grid-cols-[7rem_minmax(0,1fr)] md:gap-8" data-reveal>
      <p className="font-mono text-sm text-ink-subtle" aria-hidden="true">
        <span className="text-cyan">{index}</span> / 06
      </p>
      <div>
        <h2 id={`${id}-title`} className="text-heading font-semibold">{title}</h2>
        {children ? <div className="mt-4 max-w-measure text-body-lg text-ink-muted">{children}</div> : null}
      </div>
    </header>
  );
}
