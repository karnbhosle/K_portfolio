import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

/**
 * KARNA / CORE tokens, from the Stitch design system in
 * resources/stitch_karna_core_portfolio_ui/karna_core/DESIGN.md:
 * a restrained instrument console where cyan marks live state and copper marks milestones.
 */
const config: Config = {
  content: { relative: true, files: ['./src/**/*.{ts,tsx}'] },
  // Hover styles only apply on devices that can hover, so taps never leave a stuck hover state.
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        void: '#000000',
        surface: { DEFAULT: '#070B10', raised: '#0C1219', overlay: '#111A24' },
        line: { DEFAULT: '#16202B', strong: '#22303F', input: '#56758C' },
        ink: { DEFAULT: '#E8F0F7', muted: '#A3B3C2', subtle: '#71859A' },
        cyan: { DEFAULT: '#61E8FF', deep: '#001A20', soft: 'rgba(97, 232, 255, 0.1)', line: 'rgba(97, 232, 255, 0.38)' },
        copper: { DEFAULT: '#C98A45', soft: 'rgba(201, 138, 69, 0.1)', line: 'rgba(201, 138, 69, 0.45)' },
        signal: '#218CFF',
        danger: { DEFAULT: '#FFB4AB', soft: 'rgba(255, 180, 171, 0.08)', line: 'rgba(255, 180, 171, 0.45)' },
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        label: ['0.75rem', { lineHeight: '1.25', letterSpacing: '0.08em' }],
        caption: ['0.8125rem', { lineHeight: '1.5' }],
        body: ['1rem', { lineHeight: '1.65' }],
        'body-lg': ['1.125rem', { lineHeight: '1.65' }],
        lede: ['clamp(1.25rem, 1.05rem + 0.75vw, 1.625rem)', { lineHeight: '1.35', letterSpacing: '-0.01em' }],
        title: ['clamp(1.75rem, 1.35rem + 1.3vw, 2.5rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        heading: ['clamp(2rem, 1.45rem + 1.9vw, 3rem)', { lineHeight: '1.05', letterSpacing: '-0.025em' }],
        display: ['clamp(2.75rem, 1.2rem + 6.4vw, 7rem)', { lineHeight: '1', letterSpacing: '-0.035em' }],
        mega: ['clamp(3.75rem, 0.9rem + 10.4vw, 9.5rem)', { lineHeight: '0.86', letterSpacing: '-0.055em' }],
        section: ['clamp(2.5rem, 1.1rem + 5.4vw, 6rem)', { lineHeight: '0.95', letterSpacing: '-0.045em' }],
        case: ['clamp(3rem, 1rem + 7.6vw, 7.5rem)', { lineHeight: '0.9', letterSpacing: '-0.05em' }],
        stat: ['clamp(2.25rem, 1.6rem + 2.4vw, 3.5rem)', { lineHeight: '1', letterSpacing: '-0.04em' }],
      },
      borderRadius: { xs: '2px', sm: '4px', md: '6px', lg: '8px' },
      maxWidth: { measure: '66ch', content: '86rem' },
      spacing: { bar: '4rem' },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.23, 1, 0.32, 1)',
        'in-out': 'cubic-bezier(0.77, 0, 0.175, 1)',
      },
      transitionDuration: { fast: '150ms', base: '200ms', slow: '300ms' },
      zIndex: { chrome: '30', menu: '40', palette: '50', intro: '60' },
    },
  },
  plugins: [forms({ strategy: 'class' }), containerQueries],
};
export default config;
