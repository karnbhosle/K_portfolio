import type { Portfolio } from '@karna/shared';
import { formatRange } from '@/lib/format';
import { order } from '@/lib/style';
import { SectionHeader } from './section-header';
import { CertificateButton } from './certificate-button';

export function QualificationsSection({ portfolio }: { portfolio: Portfolio }) {
  const { education, training, profile } = portfolio;
  return (
    <section id="qualifications" aria-labelledby="qualifications-title" className="pt-24 sm:pt-32">
      <SectionHeader id="qualifications" index="02" title="Qualifications">
        <p>An MCA in progress at SIESCOMS, built on a B.Sc. in Information Technology.</p>
      </SectionHeader>

      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h3 className="label mb-6">Education</h3>
          <ol className="relative">
            {education.map((entry, index) => {
              const current = Boolean(entry.status);
              return (
                <li key={entry.id} data-reveal style={order(index)} className="relative grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-5 pb-9 last:pb-0">
                  {/* The rail joins entries into one sequence; it stops at the last one. */}
                  {index < education.length - 1 ? (
                    <span className="absolute bottom-0 left-[0.5625rem] top-6 w-px bg-line-strong" aria-hidden="true" />
                  ) : null}
                  <span
                    className={`relative mt-1.5 h-[1.125rem] w-[1.125rem] rounded-full border-2 ${current ? 'border-copper bg-copper/25' : 'border-line-strong bg-void'}`}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-mono text-xs tabular-nums text-ink-subtle">{formatRange(entry.period)}</p>
                    <p className="mt-1.5 font-display text-xl font-medium leading-snug text-ink">{entry.degree}</p>
                    <p className="mt-1 text-ink-muted">{entry.institution}</p>
                    {entry.status ? (
                      <p className="mt-3 inline-flex rounded-sm border border-copper-line bg-copper-soft px-2 py-0.5 font-mono text-xs uppercase tracking-[0.08em] text-copper">
                        {entry.status}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="space-y-10 lg:col-span-5">
          <div data-reveal>
            <h3 className="label mb-6">Training</h3>
            <ul className="space-y-4">
              {training.map((course) => (
                <li key={course.id} className="panel p-6">
                  <p className="font-mono text-xs text-ink-subtle">{course.date}</p>
                  <p className="mt-2 font-display text-xl font-medium text-ink">{course.title}</p>
                  <p className="mt-1 text-ink-muted">{course.provider} · {course.duration} · {course.mode}</p>
                  {course.certificate ? <CertificateButton certificate={course.certificate} title={course.title} /> : null}
                </li>
              ))}
            </ul>
          </div>
          <div data-reveal style={order(1)}>
            <h3 className="label mb-4">Languages</h3>
            <p className="text-ink-muted">{profile.languageProficiency}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
