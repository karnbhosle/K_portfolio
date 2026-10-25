import type { Portfolio } from '@karna/shared';
import { Award } from '@/components/ui/icons';
import { order } from '@/lib/style';
import { SectionHeader } from './section-header';
import { CertificateButton } from './certificate-button';

export function ActivitiesSection({ portfolio }: { portfolio: Portfolio }) {
  const { achievements, leadership } = portfolio.activities;
  return (
    <section id="activities" aria-labelledby="activities-title" className="pt-24 sm:pt-32">
      <SectionHeader id="activities" index="05" title="Leadership & awards">
        <p>Hackathons, and the team behind {leadership[0]?.title ?? 'our college tech fest'}.</p>
      </SectionHeader>

      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h3 className="label mb-5">Hackathons</h3>
          <ul className="divide-y divide-line border-y border-line">
            {achievements.map((achievement, index) => (
              <li key={achievement.id} className="py-5" data-reveal style={order(index)}>
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <p className="font-display text-lg font-medium leading-snug text-ink">{achievement.title}</p>
                  {achievement.result ? (
                    <p className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-copper-line bg-copper-soft px-2 py-1 font-mono text-xs uppercase tracking-[0.08em] text-copper">
                      <Award size={14} /> {achievement.result}
                    </p>
                  ) : null}
                </div>
                {[achievement.designation, achievement.location, achievement.date].some(Boolean) ? (
                  <p className="mt-1.5 text-sm text-ink-muted">
                    {[achievement.designation, achievement.location, achievement.date].filter(Boolean).join(' · ')}
                  </p>
                ) : null}
                {achievement.description ? <p className="mt-2 text-ink-muted">{achievement.description}</p> : null}
                {achievement.certificate ? <CertificateButton certificate={achievement.certificate} title={achievement.title} /> : null}
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-7">
          <h3 className="label mb-5">Leadership</h3>
          {leadership.map((entry) => (
            <article key={entry.id} aria-labelledby={`${entry.id}-title`} className="panel p-6 sm:p-8" data-reveal>
              <h4 id={`${entry.id}-title`} className="font-display text-2xl font-semibold">{entry.title}</h4>
              <p className="mt-2 text-cyan">{entry.role}</p>
              <p className="mt-1 text-sm text-ink-subtle">{entry.institution}, {entry.location}</p>
              <p className="mt-5 text-ink-muted">{entry.description}</p>
              <ul className="mt-5 space-y-2.5">
                {entry.highlights.map((highlight) => (
                  <li key={highlight} className="grid grid-cols-[0.75rem_minmax(0,1fr)] gap-3 text-ink-muted">
                    <span className="mt-[0.6em] h-1.5 w-1.5 rounded-xs bg-cyan" aria-hidden="true" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
