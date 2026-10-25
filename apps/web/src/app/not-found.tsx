import type { Metadata } from 'next';
import Link from 'next/link';
import { ReactorMark } from '@/components/reactor/arc-reactor';
import { ArrowRight } from '@/components/ui/icons';

export const metadata: Metadata = { title: 'Page not found', robots: { index: false } };

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-[100dvh] max-w-content flex-col justify-center px-5 py-16 sm:px-8">
      <ReactorMark size={40} />
      <p className="mt-10 font-mono text-sm text-ink-subtle">Error 404</p>
      <h1 className="mt-3 text-heading font-semibold">This page doesn&rsquo;t exist.</h1>
      <p className="mt-4 max-w-measure text-body-lg text-ink-muted">
        The link may be mistyped or out of date. Everything on this site lives on one page.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/" className="btn btn-primary">Go to the portfolio <ArrowRight size={17} /></Link>
        <Link href="/#contact" className="btn btn-secondary">Contact Karna</Link>
      </div>
    </main>
  );
}
