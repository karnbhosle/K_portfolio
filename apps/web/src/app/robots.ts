import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/portfolio';

export default function robots(): MetadataRoute.Robots {
  const url = siteUrl();
  return {
    rules: { userAgent: '*', allow: '/' },
    // Only advertise a sitemap once the real public origin is configured.
    ...(url ? { sitemap: new URL('/sitemap.xml', url).href, host: url.origin } : {}),
  };
}
