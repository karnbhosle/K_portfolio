'use client';

import { ReactorMark } from '@/components/reactor/arc-reactor';
import { portfolioSeed } from '@karna/shared';

/** Shown if rendering fails unexpectedly; the direct email route always works. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { email, emailHref } = portfolioSeed.profile;
  return (
    <main id="main" className="mx-auto flex min-h-[100dvh] max-w-content flex-col justify-center px-5 py-16 sm:px-8">
      <ReactorMark size={40} />
      <h1 className="mt-10 text-heading font-semibold">Something went wrong loading this page.</h1>
      <p className="mt-4 max-w-measure text-body-lg text-ink-muted">
        Try again, or reach Karna directly at <a className="text-link" href={emailHref}>{email}</a>.
      </p>
      <div className="mt-10">
        <button type="button" className="btn btn-primary" onClick={reset}>Try again</button>
      </div>
    </main>
  );
}
