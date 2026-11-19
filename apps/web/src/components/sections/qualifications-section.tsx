import type { Portfolio } from '@karna/shared';
import { formatRange } from '@/lib/format';
import { order } from '@/lib/style';
import { SectionHeader } from './section-header';
import { CertificateButton } from './certificate-button';
import { EducationTimeline, type TimelineRow } from './education-timeline';
import { HudDecor } from '@/components/ui/hud-decor';
import { ScrambleText } from '@/components/ui/scramble-text';

// Shown on hover beside each language: a greeting, nothing more.
const greetings: Record<string, string> = { English: 'Hello', Hindi: 'नमस्ते', Marathi: 'नमस्कार' };

/** "2025-2027" → [2025, 2027]; a single year spans that year. */
function years(period: string): [number, number] | null {
  const found = period.match(/\d{4}/g)?.map(Number);
  if (!found?.length) return null;
  return [found[0]!, found[1] ?? found[0]! + 1];
}

export function QualificationsSection({ portfolio }: { portfolio: Portfolio }) {
  const { education, training, profile } = portfolio;
  const spans = education.map((entry) => years(entry.period));
  const known = spans.filter((span): span is [number, number] => Boolean(span));
  const min = Math.min(...known.map(([start]) => start));
  const max = Math.max(...known.map(([, end]) => end));
  const rows: TimelineRow[] = education.map((entry, index) => ({
    id: entry.id,
    degree: entry.degree,
    // "Master of Computer Applications (MCA)" → "MCA"; "B.Sc. (Information Technology)" → "B.Sc."
    short: entry.degree.match(/\(([A-Z]{2,6})\)/)?.[1] ?? entry.degree.split(' (')[0]!,
    institution: entry.institution,
    period: formatRange(entry.period),
    status: entry.status ?? null,
    result: entry.result ?? null,
    span: spans[index] ?? null,
  }));

  return (
    <section id="qualifications" aria-labelledby="qualifications-title" className="shell pt-28 sm:pt-40">
      <SectionHeader id="qualifications" index="02" title="Qualifications">
        <p>An MCA in progress at SIESCOMS, built on a B.Sc. in Information Technology.</p>
      </SectionHeader>

      <div className="blueprint p-5 pb-9 sm:p-8 sm:pb-11 lg:p-10 lg:pb-12" data-loop>
        <EducationTimeline rows={rows} min={min} max={max} />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {training.map((course, index) => (
          <div key={course.id} data-reveal style={order(index)}>
          <article className="panel spot tilt-card relative h-full p-6 sm:p-8" data-tilt-card>
            <HudDecor />
            <h3 className="label">Training</h3>
            <p className="relative mt-5 cursor-default font-display text-2xl font-medium tracking-tight text-ink"><ScrambleText text={course.title} /></p>
            <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div><dt className="text-ink-subtle">Provider</dt><dd className="mt-0.5 text-ink">{course.provider}</dd></div>
              <div><dt className="text-ink-subtle">Duration</dt><dd className="mt-0.5 text-ink">{course.duration}</dd></div>
              <div><dt className="text-ink-subtle">Mode</dt><dd className="mt-0.5 text-ink">{course.mode}</dd></div>
              <div><dt className="text-ink-subtle">Date</dt><dd className="mt-0.5 text-ink">{course.date}</dd></div>
            </dl>
            {course.certificate ? <CertificateButton certificate={course.certificate} title={course.title} /> : null}
          </article>
          </div>
        ))}
        <div data-reveal style={order(training.length)}>
        <article className="panel spot tilt-card relative h-full p-6 sm:p-8" data-tilt-card>
          <HudDecor />
          <h3 className="label">Languages</h3>
          <ul className="relative mt-5 flex flex-wrap gap-2">
            {profile.languages.map((language) => (
              <li key={language} className="lang-chip group relative cursor-default overflow-hidden rounded-sm border border-line-strong px-3 py-1.5 font-display text-lg font-medium text-ink">
                <span className="lang-name block">{language}</span>
                {greetings[language] ? <span className="lang-hello absolute inset-0 flex items-center justify-center text-cyan" aria-hidden="true" lang={language === 'English' ? 'en' : language === 'Hindi' ? 'hi' : 'mr'}>{greetings[language]}</span> : null}
              </li>
            ))}
          </ul>
          <p className="relative mt-5 text-sm text-ink-muted">{profile.languageProficiency}</p>
        </article>
        </div>
      </div>
    </section>
  );
}
