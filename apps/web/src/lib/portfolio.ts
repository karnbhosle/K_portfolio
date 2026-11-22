import { cache } from 'react';
import { portfolioSchema, portfolioSeed, type Portfolio } from '@karna/shared';

/**
 * Content comes from the Express API (MongoDB) when it answers within 1.8s with a valid document,
 * and from the canonical shared seed otherwise. A build never depends on the API being up.
 */
export const getPortfolio = cache(async (): Promise<Portfolio> => {
  try {
    const origin = process.env.API_BASE_URL || 'http://localhost:4000';
    const response = await fetch(`${origin.replace(/\/+$/, '')}/api/portfolio`, {
      signal: AbortSignal.timeout(1800),
      next: { revalidate: 60 },
    });
    if (!response.ok) return portfolioSeed;
    const result = portfolioSchema.safeParse(await response.json());
    return result.success ? result.data : portfolioSeed;
  } catch {
    return portfolioSeed;
  }
});

/** The live site. Used for production builds on Vercel when SITE_URL is not set. */
export const PRODUCTION_URL = 'https://karnabhosle-portfolio.vercel.app';

export function siteUrl(): URL | undefined {
  const value = process.env.SITE_URL || (process.env.VERCEL_ENV === 'production' ? PRODUCTION_URL : '');
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? new URL(url.origin) : undefined;
  } catch { return undefined; }
}
