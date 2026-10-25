/** The six anchored sections, in page order. Anchor IDs are public URLs: keep them stable. */
export const sections = [
  { id: 'know-karna', index: '01', label: 'Know Karna' },
  { id: 'qualifications', index: '02', label: 'Qualifications' },
  { id: 'projects', index: '03', label: 'Projects' },
  { id: 'technical-skills', index: '04', label: 'Tech matrix' },
  { id: 'activities', index: '05', label: 'Leadership & awards' },
  { id: 'contact', index: '06', label: 'Contact' },
] as const;

export type SectionId = (typeof sections)[number]['id'];
export const sectionIds = sections.map((section) => section.id);
