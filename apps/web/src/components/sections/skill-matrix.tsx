'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Check } from '@/components/ui/icons';
import type { SkillGroupWithEvidence } from '@/lib/skills';
import { getMotion } from '@/lib/preferences';
import { order } from '@/lib/style';

interface ProjectOption { id: string; name: string; accent: 'cyan' | 'copper' }

const dot = { cyan: 'bg-cyan shadow-[0_0_8px_rgba(97,232,255,0.8)]', copper: 'bg-copper shadow-[0_0_8px_rgba(201,138,69,0.8)]' };
const lit = { cyan: 'border-cyan-line bg-cyan-soft text-ink', copper: 'border-copper-line bg-copper-soft text-ink' };
const tick = { cyan: 'text-cyan', copper: 'text-copper' };
const stroke = { cyan: '#61E8FF', copper: '#C98A45', none: '#A3B3C2' };
// The last card stretches across the empty cells of its row, so the grid never shows a hole.
const smFill = ['', 'sm:col-span-2'];
const xlFill = ['xl:col-span-1', 'xl:col-span-4', 'xl:col-span-3', 'xl:col-span-2'];

/**
 * CV skills as an interactive HUD. Dots show which projects use a skill. Choosing a project sweeps a
 * scanner across the grid and lights its stack; the gauge shows how much of the CV it covers.
 * Selecting a skill locks onto it and reads out where it is used.
 */
export function SkillMatrix({ groups, projects }: { groups: SkillGroupWithEvidence[]; projects: ProjectOption[] }) {
  const [focus, setFocus] = useState<string>('all');
  const [scan, setScan] = useState(0);
  const [locked, setLocked] = useState<string | null>(null);
  const total = groups.reduce((sum, group) => sum + group.skills.length, 0);
  const project = projects.find((entry) => entry.id === focus);
  const used = project ? groups.flatMap((group) => group.skills).filter((skill) => skill.projectIds.includes(project.id)).length : total;
  const share = used / total;
  const shown = useCountUp(used);

  const lockedSkill = locked ? groups.flatMap((group) => group.skills.map((skill) => ({ ...skill, category: group.category }))).find((skill) => skill.name === locked) : undefined;
  const lockedUsers = lockedSkill ? projects.filter((entry) => lockedSkill.projectIds.includes(entry.id)) : [];

  const choose = (id: string) => {
    setFocus(id);
    setScan((value) => value + 1);
  };

  return (
    <div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center" data-reveal>
        <div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <p id="skill-filter-label" className="text-sm text-ink-subtle">Show skills used in</p>
            <div role="group" aria-labelledby="skill-filter-label" className="flex flex-wrap gap-1 rounded-md border border-line bg-black/60 p-1">
              {[{ id: 'all', name: 'All skills', accent: null }, ...projects].map((option) => {
                const active = option.id === focus;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => choose(option.id)}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-sm px-4 text-sm font-medium transition-colors duration-fast sm:min-h-10 ${
                      active ? 'bg-ink text-void' : 'text-ink-muted hover:bg-surface-raised hover:text-ink'
                    }`}
                  >
                    {option.accent ? <span className={`h-2 w-2 rounded-full ${dot[option.accent]}`} aria-hidden="true" /> : null}
                    {option.name}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mt-4 text-sm text-ink-muted" role="status">
            {project ? `${used} of ${total} skills appear in ${project.name}.` : `${total} skills across ${groups.length} areas.`}
          </p>
        </div>

        {/* Power gauge: a reactor ring filled to the share of CV skills in play. */}
        <div className="flex items-center gap-5" aria-hidden="true">
          <svg viewBox="0 0 120 120" className="gauge h-28 w-28 -rotate-90 sm:h-32 sm:w-32">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#16202B" strokeWidth="8" />
            <circle cx="60" cy="60" r="52" fill="none" stroke="#22303F" strokeWidth="1" strokeDasharray="2 6" />
            <circle
              cx="60" cy="60" r="52" fill="none" strokeWidth="8" strokeLinecap="round"
              stroke={project ? stroke[project.accent] : stroke.none}
              pathLength={100}
              strokeDasharray="100"
              strokeDashoffset={100 - share * 100}
              className="gauge-arc"
              style={{ filter: project ? `drop-shadow(0 0 6px ${stroke[project.accent]})` : undefined }}
            />
            <circle cx="60" cy="60" r="38" fill="none" stroke="#22303F" strokeWidth="1" />
            <g className="gauge-spin" style={{ transformOrigin: '60px 60px' }}>
              <circle cx="60" cy="60" r="44" fill="none" stroke={project ? stroke[project.accent] : '#56758C'} strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="4 10" />
            </g>
          </svg>
          <div>
            <p className="font-display text-stat font-semibold tabular-nums text-ink">{shown}<span className="text-ink-subtle">/{total}</span></p>
            <p className="label mt-2">{project ? `${project.name} power` : 'Full CV'}</p>
            <p className="mt-1 font-mono text-xs tabular-nums text-ink-subtle">{Math.round(share * 100)}% of skills in play</p>
          </div>
        </div>
      </div>

      <div className="relative mt-10">
        {/* The scanner sweep, replayed on every filter change. */}
        {scan > 0 ? <span key={scan} className="skill-scan pointer-events-none absolute inset-y-0 z-20 w-24" aria-hidden="true" /> : null}

        <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 xl:grid-cols-4" data-scan={scan}>
          {groups.map((group, index) => {
            const groupUsed = project ? group.skills.filter((skill) => skill.projectIds.includes(project.id)).length : null;
            const column = index % 4;
            return (
              <div key={group.category} className={`bg-black ${index === groups.length - 1 ? `${smFill[groups.length % 2]} ${xlFill[groups.length % 4]}` : ''}`} data-reveal style={order(column)}>
                <div className="tilt-card spot relative h-full p-5 sm:p-6" data-tilt-card data-accent={project?.accent}>
                  <span className="tilt-glare pointer-events-none absolute inset-0" aria-hidden="true" />
                  <h3 className="relative flex items-baseline justify-between gap-3">
                    <span className="font-display text-lg font-medium text-ink">{group.category}</span>
                    <span className={`font-mono text-xs tabular-nums ${groupUsed ? tick[project!.accent] : 'text-ink-subtle'}`} aria-hidden="true">
                      {groupUsed === null ? String(group.skills.length).padStart(2, '0') : `${groupUsed}/${group.skills.length}`}
                    </span>
                  </h3>
                  <div className="relative mt-4">
                    <ul className="flex flex-wrap gap-2" aria-label={`${group.category} skills`}>
                      {group.skills.map((skill, position) => {
                        const on = project ? skill.projectIds.includes(project.id) : true;
                        const users = projects.filter((entry) => skill.projectIds.includes(entry.id));
                        const usage = users.length ? `Used in ${users.map((entry) => entry.name).join(' and ')}` : 'From the CV';
                        const isLocked = locked === skill.name;
                        return (
                          <li key={skill.name} className="relative" style={{ '--d': `${column * 160 + position * 40}ms` } as CSSProperties}>
                            <button
                              type="button"
                              aria-label={skill.name}
                              aria-pressed={isLocked}
                              onClick={() => setLocked(isLocked ? null : skill.name)}
                              className={`skill-tile relative inline-flex min-h-9 items-center gap-2 rounded-sm border px-3 text-sm ${
                                project && on ? `${lit[project.accent]} is-lit` : on ? 'border-line-strong bg-surface-raised text-ink' : 'border-line bg-transparent text-ink-subtle'
                              } ${isLocked ? 'is-locked' : ''}`}
                            >
                              {project && on ? <Check size={14} className={tick[project.accent]} /> : null}
                              {skill.name}
                              {!project && users.length ? (
                                <span className="flex gap-1" aria-hidden="true">
                                  {users.map((entry) => <span key={entry.id} className={`h-1.5 w-1.5 rounded-full ${dot[entry.accent]}`} />)}
                                </span>
                              ) : null}
                              {isLocked ? <span className="lock-reticle pointer-events-none absolute -inset-1.5" aria-hidden="true" /> : null}
                            </button>
                            <span className="sr-only">. {usage}.</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Target lock readout */}
      <div className="mt-5 flex min-h-12 flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-md border border-line bg-black/60 px-4 py-3" aria-live="polite">
        {lockedSkill ? (
          <p key={lockedSkill.name} className="console-line flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs">
            <span className="text-cyan">◎ Target locked</span>
            <span className="text-ink">{lockedSkill.name}</span>
            <span className="text-ink-subtle">{lockedSkill.category}</span>
            <span className="text-ink-muted">
              {lockedUsers.length ? (
                <>Used in{' '}
                  {lockedUsers.map((entry, index) => (
                    <span key={entry.id}>
                      {index ? ' and ' : ''}
                      <a href={`#project-${entry.id}`} className={`underline underline-offset-2 ${tick[entry.accent]}`}>{entry.name}</a>
                    </span>
                  ))}
                </>
              ) : 'Listed on the CV; not part of either project stack.'}
            </span>
          </p>
        ) : (
          <p className="font-mono text-xs text-ink-subtle">Select any skill to lock on and see where it is used.</p>
        )}
        <p className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-subtle">
          {projects.map((entry) => (
            <span key={entry.id} className="flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${dot[entry.accent]}`} aria-hidden="true" /> Used in {entry.name}</span>
          ))}
          <span>No dot: listed on the CV</span>
        </p>
      </div>
    </div>
  );
}

/** Counts up (or down) to a number over ~0.6s; jumps straight there with motion off. */
function useCountUp(target: number) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    if (start === target) return;
    const duration = getMotion() === 'on' ? 600 : 0;
    const began = performance.now();
    let frame = 0;
    const tickFrame = (now: number) => {
      const t = duration ? Math.min(1, (now - began) / duration) : 1;
      const next = Math.round(start + (target - start) * (1 - (1 - t) ** 3));
      setValue(next);
      from.current = next;
      if (t < 1) frame = window.requestAnimationFrame(tickFrame);
    };
    frame = window.requestAnimationFrame(tickFrame);
    return () => window.cancelAnimationFrame(frame);
  }, [target]);
  return value;
}
