'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks which section crosses a thin band 40% down the viewport. Sections are contiguous,
 * so exactly one is active at a time, and no scroll handler runs on every frame.
 */
export function useActiveSection(ids: readonly string[]): string {
  const [active, setActive] = useState(ids[0] ?? '');

  useEffect(() => {
    const elements = ids.map((id) => document.getElementById(id)).filter((element): element is HTMLElement => Boolean(element));
    const observer = new IntersectionObserver((entries) => {
      const entering = entries.filter((entry) => entry.isIntersecting);
      const latest = entering.at(-1);
      if (latest) setActive(latest.target.id);
    }, { rootMargin: '-40% 0px -55% 0px' });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}
