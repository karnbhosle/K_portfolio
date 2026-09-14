'use client';

import { useEffect, useSyncExternalStore } from 'react';

const eventName = 'karna-motion-change';
let sessionPreference: boolean | undefined;
function snapshot() {
  if (sessionPreference !== undefined) return sessionPreference;
  try {
    const saved = window.localStorage.getItem('karna-motion');
    if (saved) return saved === 'on';
  } catch { /* Preference still works without storage. */ }
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function subscribe(callback: () => void) {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', callback);
  window.addEventListener(eventName, callback);
  window.addEventListener('storage', callback);
  return () => { query.removeEventListener('change', callback); window.removeEventListener(eventName, callback); window.removeEventListener('storage', callback); };
}

export function MotionControls() {
  const enabled = useSyncExternalStore(subscribe, snapshot, () => false);
  useEffect(() => {
    document.documentElement.dataset.motion = enabled ? 'on' : 'off';
    const syncVisibility = () => { document.documentElement.dataset.visible = document.hidden ? 'false' : 'true'; };
    syncVisibility();
    document.addEventListener('visibilitychange', syncVisibility);
    if (!enabled) return () => document.removeEventListener('visibilitychange', syncVisibility);

    let cancelled = false;
    const cleanups: (() => void)[] = [];
    // Motion's small DOM animation entry point is loaded after content is visible.
    void import('motion').then(({ animate, inView }) => {
      if (cancelled) return;
      cleanups.push(inView('[data-reveal]', (element) => {
        (element as HTMLElement).dataset.arrived = 'true';
        if (!document.hidden) {
          const animation = animate(element, { opacity: [0.72, 1], y: [16, 0] }, { duration: 0.45, delay: Number((element as HTMLElement).dataset.delay || 0), ease: 'easeOut' });
          cleanups.push(() => { animation.complete(); });
        }
      }, { amount: 0.1 }));
    });
    return () => { cancelled = true; cleanups.forEach(fn => fn()); document.removeEventListener('visibilitychange', syncVisibility); };
  }, [enabled]);

  return <button type="button" className="motion-toggle" aria-label={enabled ? 'Pause motion' : 'Enable motion'} aria-pressed={enabled} onClick={() => {
    sessionPreference = !enabled;
    try { window.localStorage.setItem('karna-motion', enabled ? 'off' : 'on'); } catch { /* Storage may be disabled. */ }
    window.dispatchEvent(new Event(eventName));
  }}><span aria-hidden="true">{enabled ? 'Ⅱ' : '▷'}</span><span>Motion <b>{enabled ? 'on' : 'off'}</b></span></button>;
}
