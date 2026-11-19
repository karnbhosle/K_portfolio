'use client';

import { Pause, Play, Replay } from '@/components/ui/icons';
import { replayIntroEvent, setMotion, useMotion } from '@/lib/preferences';

/** Pauses every decorative loop on the page (WCAG 2.2.2). The choice is remembered. */
export function MotionToggle({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  const motion = useMotion();
  const on = motion === 'on';
  const label = on ? 'Pause motion' : 'Enable motion';
  if (compact) {
    return (
      <button type="button" className={`btn-icon ${className}`} aria-label={label} title={label} onClick={() => setMotion(on ? 'off' : 'on')}>
        {on ? <Pause size={17} /> : <Play size={17} />}
      </button>
    );
  }
  return (
    <button type="button" className={`btn btn-quiet ${className}`} onClick={() => setMotion(on ? 'off' : 'on')}>
      {on ? <Pause size={16} /> : <Play size={16} />}
      {label}
    </button>
  );
}

export function ReplayIntroButton({ className = '', onReplay, compact = false }: { className?: string; onReplay?: () => void; compact?: boolean }) {
  const replay = () => {
    onReplay?.();
    window.dispatchEvent(new Event(replayIntroEvent));
  };
  if (compact) {
    return (
      <button type="button" className={`btn-icon ${className}`} aria-label="Replay intro" title="Replay intro" onClick={replay}>
        <Replay size={17} />
      </button>
    );
  }
  return (
    <button type="button" className={`btn btn-quiet ${className}`} onClick={replay}>
      <Replay size={16} /> Replay intro
    </button>
  );
}
