'use client';

import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void) {
  const timer = window.setInterval(onChange, 20_000);
  return () => window.clearInterval(timer);
}

/** Karna's current local time, so a visitor in another zone knows when a reply is likely. */
export function LocalTime({ timeZone, fallback }: { timeZone: string; fallback: string }) {
  const time = useSyncExternalStore(
    subscribe,
    () => new Intl.DateTimeFormat('en-IN', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date()),
    () => null,
  );
  if (!time) return <>{fallback}</>;
  return (
    <>
      <span className="tabular-nums">{time.replace(/\s?(am|pm)$/i, (suffix) => suffix.toLowerCase())}</span>
      <span className="text-ink-subtle"> · {fallback}</span>
    </>
  );
}
