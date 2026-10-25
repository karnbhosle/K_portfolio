import type { Portfolio, Project } from '@karna/shared';

/** "Node.js/Express" → ["node", "express"]; "Scikit-learn" → ["scikit learn"]. */
function normalize(value: string): string {
  return value.toLowerCase().replace(/\.js\b/g, '').replace(/[^a-z0-9+#]+/g, ' ').trim();
}

function stackTerms(item: string): string[] {
  return [...item.split('/').map(normalize), normalize(item)];
}

/**
 * Stack entries that prove a CV skill even when its exact name is absent:
 * an Express service runs on Node.js, MongoDB is a NoSQL store, FastAPI and Flask are Python.
 */
const impliedBy: Record<string, string[]> = {
  node: ['express'],
  nosql: ['mongodb'],
  python: ['fastapi', 'flask', 'scikit learn', 'pandas', 'numpy', 'xgboost'],
  javascript: ['react', 'next', 'node', 'express'],
  html: ['react', 'next'],
  css: ['tailwind css'],
};

function matches(term: string, target: string): boolean {
  return term === target || term.startsWith(`${target} `);
}

export function projectsUsingSkill(skill: string, projects: Project[]): Project[] {
  const target = normalize(skill);
  const accepted = [target, ...(impliedBy[target] ?? [])];
  return projects.filter((project) =>
    project.stack.some((item) => stackTerms(item).some((term) => accepted.some((name) => matches(term, name)))));
}

export interface SkillWithEvidence {
  name: string;
  projectIds: string[];
}

export interface SkillGroupWithEvidence {
  category: string;
  skills: SkillWithEvidence[];
}

export function skillMatrix(portfolio: Portfolio): SkillGroupWithEvidence[] {
  return portfolio.skillGroups.map((group) => ({
    category: group.category,
    skills: group.skills.map((name) => ({
      name,
      projectIds: projectsUsingSkill(name, portfolio.projects).map((project) => project.id),
    })),
  }));
}
