'use client';

import { useState } from 'react';
import { Check } from '@/components/ui/icons';
import type { SkillGroupWithEvidence } from '@/lib/skills';

interface ProjectOption { id: string; name: string }

/** CV skills as one scannable matrix; choosing a project highlights the skills it puts to work. */
export function SkillMatrix({ groups, projects }: { groups: SkillGroupWithEvidence[]; projects: ProjectOption[] }) {
  const [focus, setFocus] = useState<string>('all');
  const total = groups.reduce((sum, group) => sum + group.skills.length, 0);
  const project = projects.find((entry) => entry.id === focus);
  const used = project ? groups.flatMap((group) => group.skills).filter((skill) => skill.projectIds.includes(project.id)).length : total;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3" data-reveal>
        <p id="skill-filter-label" className="text-sm text-ink-subtle">Show skills used in</p>
        <div role="group" aria-labelledby="skill-filter-label" className="flex flex-wrap gap-1 rounded-md border border-line bg-surface p-1">
          {[{ id: 'all', name: 'All skills' }, ...projects].map((option) => {
            const active = option.id === focus;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFocus(option.id)}
                className={`min-h-11 rounded-sm px-3.5 text-sm font-medium transition-colors duration-fast sm:min-h-10 ${
                  active ? 'bg-ink text-void' : 'text-ink-muted hover:bg-surface-raised hover:text-ink'
                }`}
              >
                {option.name}
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-4 text-sm text-ink-muted" role="status">
        {project ? `${used} of ${total} skills appear in ${project.name}.` : `${total} skills across ${groups.length} areas.`}
      </p>

      <dl className="mt-8 divide-y divide-line border-y border-line">
        {groups.map((group) => (
          <div key={group.category} className="grid gap-3 py-5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6" data-reveal>
            <dt className="pt-1.5 font-display text-base font-medium text-ink">{group.category}</dt>
            <dd>
              <ul className="flex flex-wrap gap-2">
                {group.skills.map((skill) => {
                  const lit = project ? skill.projectIds.includes(project.id) : true;
                  const usage = skill.projectIds.length
                    ? `Used in ${skill.projectIds.map((id) => projects.find((entry) => entry.id === id)?.name).join(' and ')}`
                    : 'From the CV';
                  return (
                    <li
                      key={skill.name}
                      title={usage}
                      className={`inline-flex min-h-9 items-center gap-1.5 rounded-sm border px-3 text-sm transition-colors duration-base ${
                        project && lit
                          ? 'border-cyan-line bg-cyan-soft text-ink'
                          : lit
                            ? 'border-line-strong bg-surface-raised text-ink'
                            : 'border-line bg-transparent text-ink-subtle'
                      }`}
                    >
                      {project && lit ? <Check size={14} className="text-cyan" /> : null}
                      {skill.name}
                      <span className="sr-only">. {usage}.</span>
                    </li>
                  );
                })}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
