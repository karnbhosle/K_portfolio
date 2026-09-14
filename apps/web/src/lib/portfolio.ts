import { portfolioSchema, portfolioSeed, type Portfolio } from '@karna/shared';

export async function getPortfolio(): Promise<Portfolio> {
  try {
    const origin = process.env.API_BASE_URL || 'http://localhost:4000';
    const response = await fetch(`${origin.replace(/\/$/, '')}/api/portfolio`, {
      signal: AbortSignal.timeout(1800), next: { revalidate: 60 },
    });
    if (!response.ok) return portfolioSeed;
    const result = portfolioSchema.safeParse(await response.json());
    return result.success ? result.data : portfolioSeed;
  } catch {
    return portfolioSeed;
  }
}

export function siteUrl(): URL | undefined {
  const value = process.env.SITE_URL;
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? new URL(url.origin) : undefined;
  } catch { return undefined; }
}
