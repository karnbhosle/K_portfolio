import type { ReactNode } from 'react';
import Image from 'next/image';
import type { Portfolio } from '@karna/shared';
import { ArrowRight } from '@/components/ui/icons';
import { formatFacts, formatRange, joinList } from '@/lib/format';
import { order } from '@/lib/style';
import { LocalTime } from './local-time';

export function AboutSection({ portfolio }: { portfolio: Portfolio }) {
  const { profile } = portfolio;
  const current = portfolio.education[0];
  const previous = portfolio.education[1];

  return (
    <section id="know-karna" aria-labelledby="know-karna-title" className="relative">
      <div className="pb-20 pt-12 sm:pt-16 lg:pb-28 lg:pt-28">
        {profile.availability ? (
          <p data-hero style={order(0)} className="mb-8 inline-flex items-center gap-2.5 rounded-sm border border-cyan-line bg-cyan-soft py-1.5 pl-2.5 pr-3 font-mono text-xs font-medium uppercase tracking-[0.08em] text-cyan">
            <span className="status-led h-1.5 w-1.5 rounded-full bg-cyan" aria-hidden="true" />
            {profile.availability}
          </p>
        ) : null}
        <h1 id="know-karna-title" tabIndex={-1} data-hero style={order(1)} className="text-display font-semibold outline-none [overflow-wrap:anywhere]">
          {profile.displayName}
        </h1>
        <p data-hero style={order(2)} className="mt-5 font-display text-xl font-medium text-cyan sm:text-2xl">
          {profile.role}
        </p>
        <p data-hero style={order(2)} className="mt-2 font-mono text-sm text-ink-subtle">
          {formatFacts(profile.educationLine)}
        </p>
        <p data-hero style={order(3)} className="mt-8 max-w-[34ch] text-lede text-ink">
          {profile.headline}
        </p>
        <div data-hero style={order(4)} className="mt-10 flex flex-wrap gap-3">
          <a href="#projects" className="btn btn-primary">
            View projects <ArrowRight size={17} />
          </a>
          <a href="#contact" className="btn btn-secondary">Contact me</a>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7" data-reveal>
          <h2 className="label mb-5">About</h2>
          <p className="max-w-measure text-body-lg text-ink-muted">{profile.introduction}</p>
          <ul className="mt-8 flex flex-wrap gap-2" aria-label="Focus areas">
            {profile.focusAreas.map((area) => (
              <li key={area} className="chip text-ink">{area}</li>
            ))}
          </ul>
        </div>

        <aside className="panel frame-ticks lg:col-span-5" aria-labelledby="profile-readout" data-reveal style={order(1)}>
          {profile.portrait ? (
            <Image
              src={profile.portrait.path}
              alt={profile.portrait.alt}
              width={profile.portrait.width}
              height={profile.portrait.height}
              sizes="(min-width: 1024px) 28rem, 100vw"
              className="aspect-[4/3] w-full rounded-t-lg object-cover outline outline-1 -outline-offset-1 outline-white/10"
            />
          ) : null}
          <div className="p-6 sm:p-7">
            <h2 id="profile-readout" className="label">Profile</h2>
            <dl className="mt-5 divide-y divide-line text-sm">
              <ReadoutRow term="Based in" value={profile.location} />
              <ReadoutRow term="Local time" value={<LocalTime timeZone={profile.timeZone} fallback="IST, UTC+5:30" />} />
              {current ? <ReadoutRow term="Studying" value={`${current.degree}, ${formatRange(current.period)}`} /> : null}
              {previous ? <ReadoutRow term="Previously" value={previous.degree} /> : null}
              <ReadoutRow term="Languages" value={joinList(profile.languages)} />
            </dl>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ReadoutRow({ term, value }: { term: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-4 py-3 first:pt-0 last:pb-0">
      <dt className="text-ink-subtle">{term}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
