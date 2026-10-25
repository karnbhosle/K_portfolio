import type { Profile } from '@karna/shared';
import { ArrowUp } from '@/components/ui/icons';

export function SiteFooter({ profile }: { profile: Profile }) {
  return (
    <footer className="mt-28 border-t border-line pb-12 pt-8 sm:mt-36">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-muted">© {new Date().getFullYear()} {profile.fullName}</p>
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <li><a className="inline-flex min-h-11 items-center text-ink-muted hover:text-ink" href={profile.emailHref}>Email</a></li>
          {profile.github ? (
            <li>
              <a className="inline-flex min-h-11 items-center text-ink-muted hover:text-ink" href={profile.github} target="_blank" rel="noopener noreferrer">
                GitHub<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ) : null}
          <li>
            <a className="inline-flex min-h-11 items-center gap-1.5 text-ink-muted hover:text-ink" href="#know-karna">
              Back to top <ArrowUp size={15} />
            </a>
          </li>
        </ul>
      </div>
      <p className="mt-6 max-w-measure text-caption text-ink-subtle">
        Set in Space Grotesk, Inter and JetBrains Mono. Built with Next.js, Express and MongoDB.
      </p>
    </footer>
  );
}
