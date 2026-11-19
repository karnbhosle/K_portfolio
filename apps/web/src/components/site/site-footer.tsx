import type { Profile } from '@karna/shared';
import { ReactorMark } from '@/components/reactor/arc-reactor';
import { ArrowUp } from '@/components/ui/icons';

export function SiteFooter({ profile }: { profile: Profile }) {
  return (
    <footer className="shell mt-32 pb-10 sm:mt-44">
      <div className="border-t border-line pt-10">
        <div className="wordmark group select-none" data-reveal data-loop aria-hidden="true">
          <svg viewBox="0 0 1000 170" className="h-auto w-full overflow-visible">
            <defs>
              <linearGradient id="wordmark-stroke" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#E8F0F7" stopOpacity="0.85" />
                <stop offset="45%" stopColor="#61E8FF" />
                <stop offset="100%" stopColor="#C98A45" stopOpacity="0.9" />
              </linearGradient>
              {/* The synthwave neon: magenta into violet into cyan, across the whole word. */}
              <linearGradient id="wordmark-synth" gradientUnits="userSpaceOnUse" x1="0" x2="1000" y1="0" y2="0">
                <stop offset="0%" stopColor="#FF2BD6" />
                <stop offset="50%" stopColor="#B36BFF" />
                <stop offset="100%" stopColor="#3EF6FF" />
              </linearGradient>
              {/* A soft band of light that sweeps left to right and reveals a bright neon copy of the outline. */}
              <linearGradient id="wordmark-beam-fill" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#fff" stopOpacity="0" />
                <stop offset="50%" stopColor="#fff" stopOpacity="1" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
              <mask id="wordmark-beam" maskUnits="userSpaceOnUse" x="-400" y="-40" width="1800" height="250">
                <rect className="wordmark-beam" x="-340" y="-40" width="340" height="250" fill="url(#wordmark-beam-fill)" />
              </mask>
              <filter id="wordmark-neon" x="-10%" y="-40%" width="120%" height="180%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="wide" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="tight" />
                <feMerge><feMergeNode in="wide" /><feMergeNode in="wide" /><feMergeNode in="tight" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <text x="2" y="150" textLength="996" lengthAdjust="spacingAndGlyphs" className="wordmark-text font-display" fontSize="176" fontWeight="600">
              KARNA<tspan className="wordmark-slash">/</tspan>CORE
            </text>
            <g mask="url(#wordmark-beam)" className="wordmark-sweep">
              <text x="2" y="150" textLength="996" lengthAdjust="spacingAndGlyphs" className="wordmark-neon font-display" fontSize="176" fontWeight="600" filter="url(#wordmark-neon)">
                KARNA/CORE
              </text>
              <text x="2" y="150" textLength="996" lengthAdjust="spacingAndGlyphs" className="wordmark-core font-display" fontSize="176" fontWeight="600">
                KARNA/CORE
              </text>
            </g>
          </svg>
        </div>
        <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-3 text-sm text-ink-muted">
            <ReactorMark size={20} />
            © {new Date().getFullYear()} {profile.fullName}
          </p>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <li><a className="inline-flex min-h-11 items-center text-ink-muted hover:text-ink" href={profile.emailHref}>Email</a></li>
            {profile.github ? (
              <li>
                <a className="inline-flex min-h-11 items-center text-ink-muted hover:text-ink" href={profile.github} target="_blank" rel="noopener noreferrer">
                  GitHub<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ) : null}
            <li>
              <a className="inline-flex min-h-11 items-center gap-1.5 text-ink-muted hover:text-ink" href="#know-karna">
                Back to top <ArrowUp size={15} />
              </a>
            </li>
          </ul>
        </div>
        <p className="mt-6 max-w-measure text-caption text-ink-subtle">
          Set in Space Grotesk, Inter and JetBrains Mono. Built with Next.js, Express and MongoDB. Press <kbd className="kbd">/</kbd> to jump anywhere.
        </p>
      </div>
    </footer>
  );
}
