import type { Portfolio } from '@karna/shared';
import { Award, MapPin } from '@/components/ui/icons';
import { order } from '@/lib/style';
import { SectionHeader } from './section-header';
import { CertificateButton } from './certificate-button';
import { HudDecor } from '@/components/ui/hud-decor';
import { ScrambleText } from '@/components/ui/scramble-text';

export function ActivitiesSection({ portfolio }: { portfolio: Portfolio }) {
  const { achievements, leadership } = portfolio.activities;
  return (
    <section id="activities" aria-labelledby="activities-title" className="shell pt-28 sm:pt-40">
      <SectionHeader id="activities" index="05" title="Leadership & awards">
        <p>Hackathons, and the team behind {leadership[0]?.title ?? 'our college tech fest'}.</p>
      </SectionHeader>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-5">
          <h3 className="sr-only">Hackathons</h3>
          {achievements.map((achievement, index) => {
            const meta = [achievement.designation, achievement.location, achievement.date].filter(Boolean);
            const placed = Boolean(achievement.result);
            return (
              <div key={achievement.id} data-reveal style={order(index)}>
              <article
                className={`award-card group spot tilt-card relative overflow-hidden rounded-lg border p-6 sm:p-8 ${placed ? 'frame-ticks border-copper-line bg-gradient-to-br from-copper/[0.12] via-surface to-surface' : 'border-line bg-surface'}`}
                data-accent={placed ? 'copper' : undefined}
                data-tilt-card
                data-loop={placed ? '' : undefined}
              >
                <HudDecor tone={placed ? 'text-copper' : 'text-cyan'} />
                <p className="label">Hackathon</p>
                {achievement.result ? (
                  <p className="award-result relative mt-6 flex items-center gap-3 font-display text-stat font-semibold text-copper">
                    <span className="medal inline-flex shrink-0" aria-hidden="true"><Award size={36} strokeWidth={1.4} /></span>
                    <span className="award-shine">{achievement.result}</span>
                  </p>
                ) : null}
                <h4 className={`relative cursor-default font-display font-medium leading-snug text-ink ${placed ? 'mt-4 text-xl' : 'mt-5 text-2xl'}`}><ScrambleText text={achievement.title} /></h4>
                {meta.length ? (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-muted">
                    {achievement.location ? <MapPin size={15} className="text-ink-subtle" /> : null}
                    {meta.join(' · ')}
                  </p>
                ) : null}
                {achievement.description ? <p className="mt-3 text-ink-muted">{achievement.description}</p> : null}
                {achievement.certificate ? <CertificateButton certificate={achievement.certificate} title={achievement.title} /> : null}
              </article>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-7">
          <h3 className="sr-only">Leadership</h3>
          {leadership.map((entry) => (
            <div key={entry.id} className="h-full" data-reveal style={order(1)}>
            <article aria-labelledby={`${entry.id}-title`} className="panel frame-ticks spot tilt-card relative flex h-full flex-col p-6 sm:p-10" data-tilt-card="soft">
              <HudDecor />
              <p className="label">Leadership</p>
              <h4 id={`${entry.id}-title`} className="relative mt-6 cursor-default font-display text-[clamp(2rem,1.4rem+2.4vw,3.25rem)] font-semibold leading-[1] tracking-[-0.035em]"><ScrambleText text={entry.title} /></h4>
              <p className="mt-5 text-lg text-cyan">{entry.role}</p>
              <p className="mt-1 text-sm text-ink-subtle">{entry.institution}, {entry.location}</p>
              <p className="mt-6 max-w-measure text-ink-muted">{entry.description}</p>
              <div className="mt-auto pt-8">
              <ul className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-3">
                {entry.highlights.map((highlight, position) => (
                  <li key={highlight} className="duty-item relative bg-black p-4 text-sm text-ink-muted" style={order(position)}>
                    <span className="font-mono text-xs tabular-nums text-cyan" aria-hidden="true">{String(position + 1).padStart(2, '0')}</span>
                    <p className="mt-2">{highlight}</p>
                  </li>
                ))}
              </ul>
              </div>
            </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
