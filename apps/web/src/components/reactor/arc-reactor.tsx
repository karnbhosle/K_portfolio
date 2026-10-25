import type { ReactNode } from 'react';

const coilAngles = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324];
const statorNodes: Array<[number, number, 'cyan' | 'copper']> = [
  [200, 14, 'cyan'], [361, 107, 'cyan'], [361, 293, 'cyan'], [200, 386, 'cyan'], [39, 293, 'copper'], [39, 107, 'cyan'],
];

/**
 * The KARNA / CORE arc reactor, drawn once and reused by the intro and the ambient background.
 * Each ring is its own layer so CSS can spin, separate or freeze it. Glow comes from radial
 * gradients rather than blur filters, which keeps it cheap to composite.
 */
export function ArcReactor({ id, className, core }: { id: string; className?: string; core?: ReactNode }) {
  const halo = `${id}-halo`;
  const coreGlow = `${id}-core`;
  return (
    <div className={`relative aspect-square ${className ?? ''}`}>
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id={halo}>
            <stop offset="0%" stopColor="#61E8FF" stopOpacity="0.32" />
            <stop offset="45%" stopColor="#61E8FF" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#61E8FF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={coreGlow}>
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="30%" stopColor="#61E8FF" stopOpacity="0.85" />
            <stop offset="70%" stopColor="#218CFF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#218CFF" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle className="intro-halo reactor-layer" cx="200" cy="200" r="200" fill={`url(#${halo})`} />

        <g className="reactor-layer" data-layer="stator" data-spin="forward">
          <circle cx="200" cy="200" r="190" stroke="#FFFFFF" strokeOpacity="0.35" strokeDasharray="2 9" strokeWidth="1" fill="none" />
          <circle cx="200" cy="200" r="184" stroke="#61E8FF" strokeOpacity="0.75" strokeDasharray="14 26 40 12" strokeWidth="1.6" fill="none" />
          <circle cx="200" cy="200" r="176" stroke="#FFFFFF" strokeOpacity="0.5" strokeDasharray="52 14 18 14" strokeWidth="1" fill="none" />
          <circle cx="200" cy="200" r="168" stroke="#218CFF" strokeOpacity="0.55" strokeDasharray="4 7" strokeWidth="1.2" fill="none" />
          <path d="M200 4v14M200 382v14M4 200h14M382 200h14" stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="1.6" />
          {statorNodes.map(([cx, cy, tone]) => (
            <g key={`${cx}-${cy}`}>
              <circle cx={cx} cy={cy} r="7" fill={tone === 'copper' ? '#C98A45' : '#61E8FF'} fillOpacity="0.4" />
              <circle cx={cx} cy={cy} r="3.2" fill="#FFFFFF" />
            </g>
          ))}
        </g>

        <g className="reactor-layer" data-layer="coils" data-spin="reverse">
          <circle cx="200" cy="200" r="148" stroke="#132433" strokeWidth="18" fill="none" />
          <circle cx="200" cy="200" r="148" stroke="#61E8FF" strokeOpacity="0.85" strokeDasharray="7 15" strokeWidth="1.6" fill="none" />
          <circle cx="200" cy="200" r="139" stroke="#61E8FF" strokeOpacity="0.6" strokeDasharray="18 9" strokeWidth="2" fill="none" />
          {coilAngles.map((angle, index) => (
            <g key={angle} transform={`rotate(${angle} 200 200)`}>
              <rect x="191" y="40" width="18" height="26" rx="3" fill="#07121B" stroke={index % 2 ? '#C98A45' : '#61E8FF'} strokeWidth="1.8" />
              <path d="M191 53h18" stroke="#FFFFFF" strokeOpacity="0.9" strokeWidth="2.2" />
            </g>
          ))}
        </g>

        <g className="reactor-layer" data-layer="guide" data-spin="forward">
          <circle cx="200" cy="200" r="118" stroke="#61E8FF" strokeOpacity="0.75" strokeDasharray="5 9" strokeWidth="1.3" fill="none" />
          <circle cx="200" cy="200" r="108" stroke="#FFFFFF" strokeOpacity="0.4" strokeDasharray="1 6" strokeWidth="1" fill="none" />
          <path d="M200 82v0M318 200h0M200 318v0M82 200h0" stroke="#61E8FF" strokeWidth="6" strokeLinecap="round" />
        </g>

        <g className="reactor-layer" data-layer="lens">
          <circle cx="200" cy="200" r="96" stroke="#61E8FF" strokeOpacity="0.6" strokeWidth="1.4" fill="none" />
          <circle cx="200" cy="200" r="88" stroke="#218CFF" strokeOpacity="0.55" strokeDasharray="2 4" strokeWidth="1" fill="none" />
        </g>

        <g className="reactor-layer">
          <circle cx="200" cy="200" r="74" fill="#030910" stroke="#61E8FF" strokeWidth="2.2" />
          <circle className="intro-core-glow reactor-layer" cx="200" cy="200" r="64" fill={`url(#${coreGlow})`} />
          <circle className="intro-overload reactor-layer" cx="200" cy="200" r="74" fill="#FFFFFF" opacity="0" />
          <circle cx="200" cy="200" r="68" stroke="#61E8FF" strokeOpacity="0.7" strokeWidth="1" fill="none" />
          <circle cx="200" cy="200" r="60" stroke="#61E8FF" strokeOpacity="0.4" strokeDasharray="3 4" strokeWidth="1" fill="none" />
        </g>
      </svg>
      {core ? <div className="absolute inset-0 flex items-center justify-center">{core}</div> : null}
    </div>
  );
}

/** A small reactor glyph for the brand mark: legible at 16px, drawn from the same geometry. */
export function ReactorMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="#61E8FF" strokeWidth="1.5" strokeDasharray="6 2.2" />
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="#C98A45" strokeWidth="2.2" strokeDasharray="2.6 2.4" />
      <circle cx="16" cy="16" r="5" fill="#E8F0F7" />
      <circle cx="16" cy="16" r="5" fill="none" stroke="#61E8FF" strokeWidth="1.5" />
    </svg>
  );
}
