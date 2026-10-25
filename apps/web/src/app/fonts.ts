import localFont from 'next/font/local';

// Self-hosted from @fontsource (SIL Open Font License, see ./fonts/LICENSE-*.txt).
// next/font preloads them and generates size-matched fallbacks to avoid layout shift.

export const display = localFont({
  src: [
    { path: './fonts/space-grotesk-latin-500-normal.woff2', weight: '500' },
    { path: './fonts/space-grotesk-latin-600-normal.woff2', weight: '600' },
    { path: './fonts/space-grotesk-latin-700-normal.woff2', weight: '700' },
  ],
  variable: '--font-display',
  display: 'swap',
});

export const sans = localFont({
  src: [
    { path: './fonts/inter-latin-400-normal.woff2', weight: '400' },
    { path: './fonts/inter-latin-500-normal.woff2', weight: '500' },
    { path: './fonts/inter-latin-600-normal.woff2', weight: '600' },
  ],
  variable: '--font-sans',
  display: 'swap',
});

export const mono = localFont({
  src: [
    { path: './fonts/jetbrains-mono-latin-400-normal.woff2', weight: '400' },
    { path: './fonts/jetbrains-mono-latin-500-normal.woff2', weight: '500' },
  ],
  variable: '--font-mono',
  display: 'swap',
  // Labels only; not needed for the first paint of body copy.
  preload: false,
});
