import type { Metadata, Viewport } from 'next';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import './globals.css';
import { siteUrl } from '@/lib/portfolio';

const url = siteUrl();
export const metadata: Metadata = {
  title: 'Karna Bhosle — Aspiring Software Development Engineer | KARNA / CORE',
  description: 'Karna Bhosle, MCA candidate at SIESCOMS (2025–2027). Explore AeroSense, CorpusAI, full-stack development and applied machine-learning projects.',
  ...(url ? { metadataBase: url, alternates: { canonical: '/' } } : {}),
  openGraph: { type: 'website', title: 'Karna Bhosle / CORE', description: 'Building full-stack experiences. Connecting intelligence with engineering.', ...(url ? { url: url.href, images: [{ url: '/opengraph-image', width: 1200, height: 630 }] } : {}) },
  twitter: { card: 'summary_large_image', title: 'Karna Bhosle / CORE' },
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { themeColor: '#060B12' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a>{children}</body></html>;
}
