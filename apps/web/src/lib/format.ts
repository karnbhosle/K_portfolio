/** Typographic polish for CV strings: en dashes in year ranges, middots between facts. */
export function formatRange(value: string): string {
  return value.replace(/(\d{4})\s*-\s*(\d{4})/g, '$1–$2');
}

export function formatFacts(value: string): string {
  return formatRange(value).split(/\s*\|\s*/).join(' · ');
}

/** ["English", "Hindi", "Marathi"] → "English, Hindi, and Marathi". */
export function joinList(items: readonly string[]): string {
  return new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(items);
}
