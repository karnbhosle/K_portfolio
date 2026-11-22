import type { CSSProperties, ReactNode } from 'react';
import Image from 'next/image';
import type { Portfolio } from '@karna/shared';
import { ArcReactor } from '@/components/reactor/arc-reactor';
import { ArrowRight, GitHub, Mail } from '@/components/ui/icons';
import { formatFacts, formatRange, joinList } from '@/lib/format';
import { order } from '@/lib/style';
import { LocalTime } from './local-time';
import { HudDecor } from '@/components/ui/hud-decor';
import { ScrambleText } from '@/components/ui/scramble-text';
import { taglines } from '@/lib/copy';

/** "Master of Computer Applications (MCA)" → "MCA"; falls back to the full degree. */
const shortDegree = (degree: string) => degree.match(/\(([^)]+)\)/)?.[1] ?? degree;

/** Turns the project names inside a sentence into links to their case studies. */
function linkProjects(text: string, projects: Portfolio['projects']): ReactNode[] {
  if (!projects.length) return [text];
  const pattern = new RegExp(`(${projects.map((project) => project.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  return text.split(pattern).map((part, index) => {
    const project = projects.find((entry) => entry.name === part);
    if (!project) return part;
    const copper = project.visual === 'finance';
    return (
      <a
        key={`${part}-${index}`}
        href={`#project-${project.id}`}
        className={`font-medium underline decoration-1 underline-offset-[0.2em] transition-colors duration-fast ${
          copper ? 'text-copper decoration-copper/40 hover:decoration-copper' : 'text-cyan decoration-cyan/40 hover:decoration-cyan'
        }`}
      >
        {part}
      </a>
    );
  });
}

export function AboutSection({ portfolio }: { portfolio: Portfolio }) {
  const { profile, projects, education, skillGroups, activities } = portfolio;
  const current = education[0];
  const previous = education[1];
  const award = activities.achievements.find((entry) => entry.result);
  const skillCount = skillGroups.reduce((sum, group) => sum + group.skills.length, 0);
  const [firstName, ...rest] = profile.displayName.split(' ');
  const lastName = rest.join(' ');

  // Every figure here is counted from the content; nothing is typed in by hand.
  const proof: Array<{ value: string; label: string; detail: string; tone?: 'copper' }> = [
    { value: String(projects.length).padStart(2, '0'), label: 'Full-stack ML projects', detail: projects.map((project) => project.name).join(' · ') },
    ...(award?.result ? [{ value: award.result, label: 'Hackathon result', detail: award.title, tone: 'copper' as const }] : []),
    ...(current ? [{ value: shortDegree(current.degree), label: current.status ?? 'Degree', detail: `SIESCOMS · ${formatRange(current.period)}` }] : []),
    { value: String(skillCount), label: 'Skills on the CV', detail: `Across ${skillGroups.length} areas` },
  ];

  const hud = profile.focusAreas.slice(0, 3);
  const hudPlacement = [
    { box: 'left-[-4%] top-[9%] flex-row', origin: 'right', align: 'text-right' },
    { box: 'bottom-[3%] right-[-2%] flex-row-reverse', origin: 'left', align: 'text-left' },
    { box: 'bottom-[22%] left-[-8%] flex-row', origin: 'right', align: 'text-right' },
  ];

  return (
    <section id="know-karna" aria-labelledby="know-karna-title" className="relative">
      {/* Hero */}
      <div className="relative overflow-x-clip">
        <div className="shell relative flex min-h-[100svh] flex-col pt-bar">
          <div className="relative grid flex-1 grid-cols-[minmax(0,1fr)] items-center gap-10 py-12 sm:py-16 lg:grid-cols-12 lg:py-4">
            <div className="relative z-10 lg:col-span-7">
              {profile.availability ? (
                <p data-hero style={order(0)} className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-cyan-line bg-black/50 py-1.5 pl-3 pr-3.5 font-mono text-xs font-medium uppercase tracking-[0.08em] text-cyan backdrop-blur-sm">
                  <span className="status-led h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_10px_#61e8ff]" aria-hidden="true" />
                  {profile.availability}
                </p>
              ) : null}

              <h1 id="know-karna-title" tabIndex={-1} className="text-mega font-semibold outline-none [overflow-wrap:anywhere]">
                <span className="mask-line"><span style={order(0)}>{firstName}</span></span>{' '}
                {lastName ? (
                  <span className="mask-line">
                    <span style={order(1)} className="bg-gradient-to-r from-ink via-ink to-ink-subtle bg-clip-text text-transparent">{lastName}</span>
                  </span>
                ) : null}
              </h1>

              <div data-hero style={order(3)} className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2">
                <p className="font-display text-xl font-medium text-cyan sm:text-2xl">{profile.role}</p>
                <span className="hidden h-4 w-px bg-line-strong sm:block" aria-hidden="true" />
                <p className="font-mono text-sm text-ink-subtle">{formatFacts(profile.educationLine)}</p>
              </div>

              <p data-hero style={order(4)} className="mt-6 max-w-[36ch] font-display text-[clamp(1.375rem,1.05rem+1.2vw,2.125rem)] font-medium leading-[1.15] tracking-[-0.025em] text-ink-muted">
                {taglines.hero.lead} <span className="block text-ink">{taglines.hero.punch}</span>
              </p>

              <div data-hero style={order(5)} className="mt-8 flex flex-wrap items-center gap-3">
                <a href="#projects" className="btn btn-primary">
                  View projects <ArrowRight size={17} />
                </a>
                <a href="#contact" className="btn btn-secondary">Contact me</a>
                {profile.github ? (
                  <a href={profile.github} target="_blank" rel="noopener noreferrer" className="btn btn-quiet">
                    <GitHub size={17} /> GitHub<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : null}
              </div>
            </div>

            {/* The reactor's hero slot. The reactor itself lives in the fixed core layer (CoreJourney),
                which reads this anchor's box. ~12% larger than the column on desktop; a watermark on phones. */}
            <div
              className="pointer-events-none absolute right-[-42%] top-2 w-[112vw] max-w-[40rem] sm:right-[-20%] lg:pointer-events-auto lg:relative lg:right-auto lg:top-auto lg:col-span-5 lg:-mx-[6%] lg:w-[112%] lg:max-w-none"
              aria-hidden="true"
            >
              <div className="relative aspect-square" data-hero-hud>
                <div className="absolute inset-[9%] rounded-full [--core-opacity:0.28] sm:[--core-opacity:0.32] lg:cursor-crosshair lg:[--core-opacity:1]" data-core-anchor title="Fire the core">
                  {/* Shown only without JavaScript, when the core layer cannot run. */}
                  <div className="core-fallback h-full w-full opacity-[var(--core-opacity)]">
                    <ArcReactor id="fallback" core={<span className="core-initials">K.B</span>} />
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-0 transition-opacity duration-base" data-core-hud>
                  {hud.map((area, index) => {
                    const place = hudPlacement[index]!;
                    return (
                      <div key={area} className={`absolute hidden items-center gap-3 lg:flex ${place.box}`} style={order(index)}>
                        <span className={`hud-text ${place.align}`} style={order(index)}>
                          <span className="block font-mono text-[0.625rem] uppercase tracking-[0.16em] text-cyan/80">Sys.{String(index + 1).padStart(2, '0')}</span>
                          <span className="mt-0.5 block whitespace-nowrap font-display text-sm font-medium text-ink">{area}</span>
                        </span>
                        <span className="hud-line relative block h-px w-14 bg-gradient-to-r from-cyan/70 to-cyan/10 xl:w-20" style={{ ...order(index), '--origin': place.origin } as CSSProperties}>
                          <span className={`absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-cyan shadow-[0_0_8px_#61e8ff] ${place.origin === 'left' ? 'left-0' : 'right-0'}`} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Proof strip */}
          <dl data-hero style={order(6)} className="relative z-10 grid grid-cols-2 border-t border-line lg:grid-cols-4">
            {proof.map((item, index) => (
              <div
                key={item.label}
                className={`min-w-0 py-6 pr-4 sm:py-7 lg:py-6 ${index % 2 ? 'border-l border-line pl-4 sm:pl-6' : ''} ${index > 1 ? 'border-t border-line lg:border-t-0' : ''} ${index === 2 ? 'lg:border-l lg:pl-6' : ''}`}
              >
                <dt className="label">{item.label}</dt>
                <dd className={`mt-3 font-display text-stat font-semibold tabular-nums ${item.tone === 'copper' ? 'text-copper' : 'text-ink'}`}>{item.value}</dd>
                <dd className="mt-2 text-sm text-ink-muted [overflow-wrap:anywhere]">{item.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* About: the core finishes its journey and docks behind this block. */}
      <div className="shell pt-20 sm:pt-28" data-core-dock>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7" data-reveal>
            <h2 className="label flex items-center gap-3">
              <span className="text-cyan">01</span> About
              <span className="draw-x h-px flex-1 bg-line-strong" aria-hidden="true" />
            </h2>
            <p className="mt-8 font-display text-[clamp(1.375rem,1.1rem+1.1vw,2.125rem)] font-medium leading-[1.3] tracking-[-0.02em] text-ink">
              {linkProjects(profile.introduction, projects)}
            </p>

            <h3 className="label mt-14">Focus areas</h3>
            <ol className="mt-5 divide-y divide-line border-y border-line">
              {profile.focusAreas.map((area, index) => (
                <li key={area} className="focus-row group relative flex cursor-default items-center gap-5 overflow-hidden py-4">
                  <span className="focus-sweep pointer-events-none absolute inset-0" aria-hidden="true" />
                  <span className="relative font-mono text-xs tabular-nums text-cyan">{String(index + 1).padStart(2, '0')}</span>
                  <span className="relative font-display text-xl font-medium text-ink transition-transform duration-base ease-out group-hover:translate-x-2"><ScrambleText text={area} /></span>
                  <span className="relative ml-auto font-mono text-[0.625rem] uppercase tracking-[0.14em] text-cyan opacity-0 transition-opacity duration-base group-hover:opacity-100" aria-hidden="true">Sys.0{index + 1} online</span>
                </li>
              ))}
            </ol>
          </div>

          <aside className="lg:col-span-5" aria-labelledby="profile-readout" data-reveal style={order(1)}>
            <div className="id-card panel frame-ticks spot tilt-card relative overflow-hidden lg:sticky lg:top-24" data-tilt-card="soft">
              <HudDecor />
              {profile.portrait ? (
                // An ID-card portrait: the cut-out photo over the blueprint grid, scanned on hover.
                <figure className="id-portrait relative overflow-hidden border-b border-line">
                  <span className="id-grid absolute inset-0" aria-hidden="true" />
                  <span className="id-halo absolute left-[8%] top-[4%] aspect-square w-[46%] rounded-full" aria-hidden="true" />
                  <Image
                    src={profile.portrait.path}
                    alt={profile.portrait.alt}
                    width={profile.portrait.width}
                    height={profile.portrait.height}
                    sizes="(min-width: 1024px) 26rem, (min-width: 640px) 24rem, 92vw"
                    className="id-photo relative mx-auto h-auto w-full sm:w-[70%] lg:w-full"
                  />
                  <span className="id-scan pointer-events-none absolute inset-x-0 top-0 h-1/3" aria-hidden="true" />
                  <figcaption className="relative flex items-center justify-between gap-4 border-t border-line bg-black/60 px-6 py-3 sm:px-7">
                    <span className="min-w-0 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-cyan">{profile.role}</span>
                    <span className="id-badge shrink-0 rounded-xs border border-cyan-line px-1.5 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-cyan" aria-hidden="true">K.B</span>
                  </figcaption>
                </figure>
              ) : null}
              <div className="flex items-center justify-between border-b border-line px-6 py-4 sm:px-7">
                <h2 id="profile-readout" className="label">Profile</h2>
                <span className="flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-subtle">
                  <span className="status-led h-1.5 w-1.5 rounded-full bg-cyan" aria-hidden="true" /> Live
                </span>
              </div>
              <dl className="divide-y divide-line px-6 text-sm sm:px-7">
                <ReadoutRow term="Based in" value={profile.location} />
                <ReadoutRow term="Local time" value={<LocalTime timeZone={profile.timeZone} fallback="IST, UTC+5:30" />} />
                {current ? <ReadoutRow term="Studying" value={`${current.degree}, ${formatRange(current.period)}`} /> : null}
                {previous ? <ReadoutRow term="Previously" value={previous.degree} /> : null}
                <ReadoutRow term="Languages" value={joinList(profile.languages)} />
              </dl>
              <div className="border-t border-line p-6 sm:p-7">
                <a href={profile.emailHref} className="btn btn-secondary w-full justify-between">
                  <span className="flex min-w-0 items-center gap-2"><Mail size={17} /> <span className="truncate">{profile.email}</span></span>
                  <ArrowRight size={16} className="shrink-0" />
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function ReadoutRow({ term, value }: { term: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-4 py-3.5">
      <dt className="text-ink-subtle">{term}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
