import { resolve } from 'node:path';
import type { NextConfig } from 'next';

/** The browser may only talk to this site, the configured contact API and the public air-quality feed. */
function apiOrigin(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? '').origin;
  } catch {
    return '';
  }
}

// Inline scripts stay allowed: Next streams its payload inline and the page has a pre-paint
// boot script, and per-request nonces would force every visit to render dynamically.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "media-src 'self'",
  // Open-Meteo: the live Mumbai air-quality reading in the AeroSense case study.
  `connect-src 'self' https://air-quality-api.open-meteo.com${apiOrigin() ? ` ${apiOrigin()}` : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const config: NextConfig = {
  poweredByHeader: false,
  // Resolve the workspace link and compiled package from the repository root.
  turbopack: { root: resolve(__dirname, '../..') },
  transpilePackages: ['@karna/shared'],
  async headers() {
    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    ];
    // Development needs eval and websockets for fast refresh, so the CSP and HSTS ship with builds only.
    if (process.env.NODE_ENV === 'production') {
      security.push(
        { key: 'Content-Security-Policy', value: contentSecurityPolicy },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
      );
    }
    return [{ source: '/(.*)', headers: security }];
  },
};
export default config;
