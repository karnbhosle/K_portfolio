import { useSyncExternalStore } from 'react';
import { storageKeys } from './boot';

/**
 * Visitor preferences live on <html> data attributes so CSS can react before React hydrates.
 * The boot script in layout.tsx sets them before first paint; these stores keep them in sync.
 */

export type Toggle = 'on' | 'off';
export type IntroPhase = 'pending' | 'charging' | 'discharge' | 'leaving';

type Listener = () => void;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach((listener) => listener());

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function store(key: string, value: string | null, session = false) {
  try {
    const target = session ? window.sessionStorage : window.localStorage;
    if (value === null) target.removeItem(key);
    else target.setItem(key, value);
  } catch {
    // Storage can be blocked (private modes, embedded previews); the choice still applies to this page.
  }
}

export function read(key: string, session = false): string | null {
  try {
    return (session ? window.sessionStorage : window.localStorage).getItem(key);
  } catch {
    return null;
  }
}

const root = () => document.documentElement;

export function getMotion(): Toggle {
  return root().dataset.motion === 'off' ? 'off' : 'on';
}

export function setMotion(value: Toggle) {
  root().dataset.motion = value;
  store(storageKeys.motion, value);
  notify();
}

export function useMotion(): Toggle {
  return useSyncExternalStore(subscribe, getMotion, () => 'on');
}

/** Follows a change to the OS reduced-motion setting unless the visitor chose explicitly here. */
export function followSystemMotion(reduce: boolean) {
  if (read(storageKeys.motion)) return;
  root().dataset.motion = reduce ? 'off' : 'on';
  notify();
}

export function getSound(): Toggle {
  return root().dataset.sound === 'off' ? 'off' : 'on';
}

export function setSound(value: Toggle) {
  root().dataset.sound = value;
  store(storageKeys.sound, value);
  notify();
}

export function useSound(): Toggle {
  return useSyncExternalStore(subscribe, getSound, () => 'on');
}

export function getIntroPhase(): IntroPhase | null {
  const phase = root().dataset.intro;
  return phase === 'pending' || phase === 'charging' || phase === 'discharge' || phase === 'leaving' ? phase : null;
}

/** Moves the ignition sequence along. CSS animates from the attribute; React only renders labels. */
export function setIntroPhase(phase: IntroPhase | null) {
  if (phase) root().dataset.intro = phase;
  else delete root().dataset.intro;
  if (phase === null) store(storageKeys.intro, 'done', true);
  notify();
}

export function useIntroPhase(): IntroPhase | null {
  return useSyncExternalStore(subscribe, getIntroPhase, () => null);
}

const noopSubscribe = () => () => {};

/** False during server rendering and hydration, true once the browser has taken over. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/** Lets any control replay the intro, wherever it sits in the tree. */
export const replayIntroEvent = 'karna:replay-intro';
