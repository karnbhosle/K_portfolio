import type { Portfolio } from '@karna/shared';
import { skillMatrix } from '@/lib/skills';
import { SectionHeader } from './section-header';
import { SkillMatrix } from './skill-matrix';

export function SkillsSection({ portfolio }: { portfolio: Portfolio }) {
  const groups = skillMatrix(portfolio);
  const projects = portfolio.projects.map(({ id, name, visual }) => ({ id, name, accent: visual === 'finance' ? 'copper' as const : 'cyan' as const }));
  return (
    <section id="technical-skills" aria-labelledby="technical-skills-title" className="shell pt-28 sm:pt-40" data-loop>
      <SectionHeader id="technical-skills" index="04" title="Tech matrix">
        <p>Every skill from my CV, linked to the projects that use it. Pick a project to see its stack in context.</p>
      </SectionHeader>
      <SkillMatrix groups={groups} projects={projects} />
    </section>
  );
}
