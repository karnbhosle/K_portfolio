'use client';

import { Pause, Play, Replay } from '@/components/ui/icons';
import { replayIntroEvent, setMotion, useMotion } from '@/lib/preferences';

/** Pauses every decorative loop on the page (WCAG 2.2.2). The choice is remembered. */
export function MotionToggle({ className = '' }: { className?: string }) {
  const motion = useMotion();
  const on = motion === 'on';
  return (
    <button type="button" className={`btn btn-quiet ${className}`} onClick={() => setMotion(on ? 'off' : 'on')}>
      {on ? <Pause size={16} /> : <Play size={16} />}
      {on ? 'Pause motion' : 'Enable motion'}
    </button>
  );
}

export function ReplayIntroButton({ className = '', onReplay }: { className?: string; onReplay?: () => void }) {
  return (
    <button
      type="button"
      className={`btn btn-quiet ${className}`}
      onClick={() => {
        onReplay?.();
        window.dispatchEvent(new Event(replayIntroEvent));
      }}
    >
      <Replay size={16} /> Replay intro
    </button>
  );
}
