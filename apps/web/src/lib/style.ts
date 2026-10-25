import type { CSSProperties } from 'react';

/** Position in a staggered entrance; CSS multiplies it into a transition delay. */
export function order(index: number, extra?: CSSProperties): CSSProperties {
  return { '--i': index, ...extra } as CSSProperties;
}
