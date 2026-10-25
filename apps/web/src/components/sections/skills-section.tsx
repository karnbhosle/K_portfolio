import type { Portfolio } from '@karna/shared';
import { skillMatrix } from '@/lib/skills';
import { SectionHeader } from './section-header';
import { SkillMatrix } from './skill-matrix';

export function SkillsSection({ portfolio }: { portfolio: Portfolio }) {
  const groups = skillMatrix(portfolio);
  return (
    <section id="technical-skills" aria-labelledby="technical-skills-title" className="pt-24 sm:pt-32">
      <SectionHeader id="technical-skills" index="04" title="Tech matrix">
        <p>Every skill from my CV, linked to the projects that use it. Pick a project to see its stack in context.</p>
      </SectionHeader>
      <SkillMatrix groups={groups} projects={portfolio.projects.map(({ id, name }) => ({ id, name }))} />
    </section>
  );
}
