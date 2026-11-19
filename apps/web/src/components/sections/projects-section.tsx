import Image from 'next/image';
import type { Portfolio, Project } from '@karna/shared';
import { ArrowUpRight, GitHub } from '@/components/ui/icons';
import { order } from '@/lib/style';
import { SectionHeader } from './section-header';
import { ServiceFlow } from './service-flow';
import { PipelineSteps } from './pipeline-steps';
import { AqiBands } from './aqi-bands';
import { CorpusRunGame, SmogInvadersGame } from './project-arcade';
import { CorpusGrowthChart } from './corpus-growth-chart';
import { CityAirChart } from './city-air-chart';
import { ScrambleText } from '@/components/ui/scramble-text';

const numberWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const word = (count: number) => numberWords[count] ?? String(count);
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function ProjectsSection({ portfolio }: { portfolio: Portfolio }) {
  const count = portfolio.projects.length;
  return (
    <section id="projects" aria-labelledby="projects-title" className="pt-28 sm:pt-40">
      <div className="shell">
        <SectionHeader id="projects" index="03" title="Projects">
          <p>
            {capitalize(word(count))} full-stack {count === 1 ? 'system' : 'systems'} that pair product interfaces with applied machine learning.
          </p>
        </SectionHeader>

        {/* Index of the case studies below. */}
        <ol className="mb-16 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:mb-24 md:grid-cols-2" data-reveal>
          {portfolio.projects.map((project, index) => {
            const copper = project.visual === 'finance';
            return (
              <li key={project.id} className="bg-black">
                <a href={`#project-${project.id}`} className="spot group flex h-full items-start justify-between gap-6 p-6 sm:p-8" data-accent={copper ? 'copper' : 'cyan'}>
                  <span className="min-w-0">
                    <span className={`font-mono text-xs uppercase tracking-[0.08em] ${copper ? 'text-copper' : 'text-cyan'}`}>
                      {String(index + 1).padStart(2, '0')} · {copper ? 'Financial planning' : 'Air quality'}
                    </span>
                    <span className="mt-3 block font-display text-3xl font-semibold tracking-tight text-ink"><ScrambleText text={project.name} /></span>
                    <span className="mt-1.5 block text-sm text-ink-muted">{project.subtitle}</span>
                  </span>
                  <ArrowUpRight size={20} className="mt-1 shrink-0 rotate-90 text-ink-subtle transition-transform duration-base ease-out group-hover:translate-y-1 group-hover:text-ink" />
                </a>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="space-y-28 sm:space-y-40">
        {portfolio.projects.map((project, index) => (
          <ProjectFeature key={project.id} project={project} index={index} />
        ))}
      </div>
    </section>
  );
}

function ProjectFeature({ project, index }: { project: Project; index: number }) {
  const finance = project.visual === 'finance';
  const accent = finance ? 'copper' : 'cyan';
  const accentText = finance ? 'text-copper' : 'text-cyan';
  const accentBorder = finance ? 'border-copper-line' : 'border-cyan-line';
  const number = String(index + 1).padStart(2, '0');

  return (
    <article id={`project-${project.id}`} aria-labelledby={`${project.id}-title`} className="shell relative" data-accent={accent}>
      {/* Header */}
      <header className="relative grid gap-8 border-t border-line pt-10 lg:grid-cols-12 lg:gap-12" data-reveal>
        <span className={`draw-x absolute left-0 top-[-1px] h-px w-40 bg-gradient-to-r ${finance ? 'from-copper' : 'from-cyan'} to-transparent`} aria-hidden="true" />
        <div className="min-w-0 lg:col-span-8">
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-ink-subtle">
            <span className={accentText}>Project {number}</span>
            <span aria-hidden="true"> · </span>
            {finance ? 'Financial planning' : 'Air quality'}
          </p>
          <h3 id={`${project.id}-title`} className="mt-5 cursor-default text-case font-semibold"><ScrambleText text={project.name} /></h3>
          <p className="mt-4 font-display text-xl font-medium text-ink-muted sm:text-2xl">{project.subtitle}</p>
        </div>
        <div className="flex flex-col justify-end gap-6 lg:col-span-4">
          <p className="text-body-lg text-ink-muted">{project.summary}</p>
          <a
            href={project.repository}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary self-start"
            aria-label={`View the ${project.name} repository on GitHub (opens in a new tab)`}
          >
            <GitHub size={16} /> Repository <ArrowUpRight size={15} className="text-ink-subtle" />
          </a>
        </div>
      </header>

      {finance
        ? <CorpusRunGame id={project.id} name={project.name} briefAnchor={`${project.id}-brief`} />
        : <SmogInvadersGame id={project.id} name={project.name} briefAnchor={`${project.id}-brief`} />}

      {/* The project's idea, as a chart you can play with. */}
      <div className="mt-8 sm:mt-10">{finance ? <CorpusGrowthChart /> : <CityAirChart />}</div>

      {project.screenshot ? (
        <Image
          src={project.screenshot.path}
          alt={project.screenshot.alt}
          width={project.screenshot.width}
          height={project.screenshot.height}
          sizes="(min-width: 1376px) 80rem, 100vw"
          className="mt-12 h-auto w-full rounded-lg outline outline-1 -outline-offset-1 outline-white/10"
        />
      ) : null}

      {/* Architecture: the full case study starts here. */}
      <div id={`${project.id}-brief`} className="mt-12 scroll-mt-24 sm:mt-16" data-reveal>
        <h4 className="sr-only">Architecture</h4>
        <ServiceFlow nodes={project.architecture.nodes} database={project.architecture.database} note={project.architecture.note} accent={accent} />
      </div>

      {/* Highlights */}
      <div className="mt-16 sm:mt-20">
        <h4 className="label mb-6">Highlights</h4>
        <ol className="grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-3">
          {project.highlights.map((highlight, position) => (
            <li key={highlight} className="bg-black" data-reveal style={order(position)}>
              <div className="tilt-card spot relative h-full p-6 sm:p-7" data-tilt-card>
                <span className="tilt-glare pointer-events-none absolute inset-0" aria-hidden="true" />
                <span className={`hud-corners pointer-events-none absolute inset-3 ${accentText}`} aria-hidden="true" />
                <span className={`font-mono text-xs tabular-nums ${accentText}`} aria-hidden="true">{String(position + 1).padStart(2, '0')}</span>
                <p className="relative mt-4 text-ink">{highlight}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Pipeline */}
      {project.pipeline.length ? (
        <div className="mt-16 sm:mt-20">
          <PipelineSteps id={project.id} stages={project.pipeline} accent={accent} title={finance ? `${capitalize(word(project.pipeline.length))}-stage ML pipeline` : 'Prediction flow'} />
        </div>
      ) : null}

      {finance && project.features.length ? (
        <div className="mt-16 sm:mt-20" data-reveal>
          <h4 className="label mb-5">Planning features</h4>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {project.features.map((feature) => (
              <li key={feature} className={`rounded-md border ${accentBorder} bg-copper-soft px-4 py-3.5 font-medium text-ink`}>{feature}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {project.visual === 'air' ? (
        <div className="mt-16 sm:mt-20" data-reveal>
          <h4 className="label mb-2">CPCB classification</h4>
          <p className="mb-6 max-w-measure text-sm text-ink-muted">
            Predicted AQI scores map onto India&rsquo;s national AQI bands. Select a band to read its health guidance.
          </p>
          <AqiBands />
        </div>
      ) : null}

      {/* Notes and stack */}
      <div className="mt-16 grid gap-10 border-t border-line pt-2 sm:mt-20 lg:grid-cols-12 lg:gap-12">
        <details className="group lg:col-span-7">
          <summary className="flex min-h-14 list-none items-center justify-between gap-4 font-display text-lg font-medium text-ink hover:text-cyan [&::-webkit-details-marker]:hidden">
            Implementation notes
            <span className={`flex h-8 w-8 items-center justify-center rounded-full border border-line-strong text-ink-subtle transition-transform duration-base ease-out group-open:rotate-45 group-open:text-ink`} aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
            </span>
          </summary>
          <div className="max-w-measure space-y-4 pb-2 pt-2 text-ink-muted">
            {project.details.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </details>

        <div className="pt-4 lg:col-span-5">
          <h4 className="label mb-4">Stack · {project.stack.length}</h4>
          <ul className="flex flex-wrap gap-1.5">
            {project.stack.map((item) => <li key={item} className="chip">{item}</li>)}
          </ul>
        </div>
      </div>
    </article>
  );
}
