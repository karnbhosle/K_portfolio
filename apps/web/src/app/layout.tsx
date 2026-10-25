import type { Metadata, Viewport } from 'next';
import './globals.css';
import { display, mono, sans } from './fonts';
import { siteUrl } from '@/lib/portfolio';
import { bootScript } from '@/lib/boot';

const url = siteUrl();
const title = 'Karna Bhosle · Aspiring Software Development Engineer';
const description = 'Karna Bhosle, MCA candidate at SIESCOMS (2025–2027), builds full-stack applications and applied machine-learning systems, including CorpusAI and AeroSense.';

export const metadata: Metadata = {
  title: { default: title, template: '%s · Karna Bhosle' },
  description,
  applicationName: 'KARNA / CORE',
  authors: [{ name: 'Karna Bhosle' }],
  ...(url ? { metadataBase: url, alternates: { canonical: '/' } } : {}),
  openGraph: {
    type: 'profile',
    title,
    description: 'Building full-stack experiences. Connecting intelligence with engineering.',
    siteName: 'KARNA / CORE',
    locale: 'en_IN',
    ...(url ? { url: url.href } : {}),
  },
  twitter: { card: 'summary_large_image', title, description },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-IN"
      dir="ltr"
      data-scroll-behavior="smooth"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Sets motion, sound and intro state before first paint; see lib/boot.ts. */}
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
