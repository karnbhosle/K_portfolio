'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { LazyMotion, m } from 'motion/react';

const loadFeatures = () => import('./motion-features').then(module => module.default);
export function ReactorFrame({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (ref.current) ref.current.dataset.inView = String(entry.isIntersecting);
    }, { threshold: 0.05 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <LazyMotion features={loadFeatures}><m.div ref={ref} className="reactor-frame" data-in-view="false" aria-hidden="true" initial={false}>{children}</m.div></LazyMotion>;
}
