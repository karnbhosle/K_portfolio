import Image from 'next/image';
import type { Portfolio, Project } from '@karna/shared';
import { ArrowUpRight, GitHub } from '@/components/ui/icons';
import { order } from '@/lib/style';
import { SectionHeader } from './section-header';
import { ServiceFlow } from './service-flow';
import { PipelineSteps } from './pipeline-steps';
import { AqiBands } from './aqi-bands';

const numberWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const word = (count: number) => numberWords[count] ?? String(count);
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function ProjectsSection({ portfolio }: { portfolio: Portfolio }) {
  const count = portfolio.projects.length;
  return (
    <section id="projects" aria-labelledby="projects-title" className="pt-24 sm:pt-32">
      <SectionHeader id="projects" index="03" title="Projects">
        <p>
          {capitalize(word(count))} full-stack {count === 1 ? 'system' : 'systems'} that pair product interfaces with applied machine learning.
        </p>
      </SectionHeader>
      <div className="space-y-10 sm:space-y-14">
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
  const marker = finance ? 'bg-copper' : 'bg-cyan';

  return (
    <article id={`project-${project.id}`} aria-labelledby={`${project.id}-title`} className="panel frame-ticks" data-accent={accent}>
      <div className="p-6 sm:p-8 lg:p-10">
        <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-5" data-reveal>
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-[0.08em] text-ink-subtle">
              <span className={accentText}>Project {String(index + 1).padStart(2, '0')}</span>
              <span aria-hidden="true"> · </span>
              {finance ? 'Financial planning' : 'Air quality'}
            </p>
            <h3 id={`${project.id}-title`} className="mt-3 text-title font-semibold">{project.name}</h3>
            <p className="mt-2 text-ink-muted">{project.subtitle}</p>
          </div>
          <a
            href={project.repository}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary shrink-0"
            aria-label={`View the ${project.name} repository on GitHub (opens in a new tab)`}
          >
            <GitHub size={16} /> Repository <ArrowUpRight size={15} className="text-ink-subtle" />
          </a>
        </header>

        <p className="mt-6 max-w-measure text-body-lg text-ink-muted" data-reveal>{project.summary}</p>

        {project.screenshot ? (
          <Image
            src={project.screenshot.path}
            alt={project.screenshot.alt}
            width={project.screenshot.width}
            height={project.screenshot.height}
            sizes="(min-width: 1280px) 60rem, 100vw"
            className="mt-8 h-auto w-full rounded-md outline outline-1 -outline-offset-1 outline-white/10"
          />
        ) : null}

        <div className="mt-10 grid gap-10 xl:grid-cols-12 xl:gap-12">
          <div className="xl:col-span-5" data-reveal>
            <h4 className="label mb-4">Highlights</h4>
            <ul className="space-y-3.5">
              {project.highlights.map((highlight) => (
                <li key={highlight} className="grid grid-cols-[0.75rem_minmax(0,1fr)] gap-3 text-ink-muted">
                  <span className={`mt-[0.6em] h-1.5 w-1.5 rounded-xs ${marker}`} aria-hidden="true" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="xl:col-span-7" data-reveal style={order(1)}>
            <h4 className="label mb-4">Architecture</h4>
            <ServiceFlow nodes={project.architecture.nodes} database={project.architecture.database} note={project.architecture.note} accent={accent} />
          </div>
        </div>

        {project.pipeline.length ? (
          <div className="mt-12">
            <h4 className="label mb-6">{finance ? `${capitalize(word(project.pipeline.length))}-stage ML pipeline` : 'Prediction flow'}</h4>
            <PipelineSteps stages={project.pipeline} accent={accent} />
          </div>
        ) : null}

        {finance && project.features.length ? (
          <div className="mt-10" data-reveal>
            <h4 className="label mb-4">Planning features</h4>
            <ul className="flex flex-wrap gap-2">
              {project.features.map((feature) => <li key={feature} className="chip text-ink">{feature}</li>)}
            </ul>
          </div>
        ) : null}

        {project.visual === 'air' ? (
          <div className="mt-12" data-reveal>
            <h4 className="label mb-2">CPCB classification</h4>
            <p className="mb-5 max-w-measure text-sm text-ink-muted">
              Predicted AQI scores map onto India&rsquo;s national AQI bands. Select a band to read its health guidance.
            </p>
            <AqiBands />
          </div>
        ) : null}

        <details className="group mt-10 border-t border-line pt-2">
          <summary className="flex min-h-12 list-none items-center justify-between gap-4 font-medium text-ink hover:text-cyan [&::-webkit-details-marker]:hidden">
            Implementation notes
            <span className="text-ink-subtle transition-transform duration-base ease-out group-open:rotate-45" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
            </span>
          </summary>
          <div className="max-w-measure space-y-3 pb-2 pt-2 text-ink-muted">
            {project.details.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </details>

        <div className="mt-6 border-t border-line pt-6">
          <h4 className="label mb-3">Stack</h4>
          <ul className="flex flex-wrap gap-1.5">
            {project.stack.map((item) => <li key={item} className="chip">{item}</li>)}
          </ul>
        </div>
      </div>
    </article>
  );
}
