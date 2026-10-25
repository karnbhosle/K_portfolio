'use client';

import { useState } from 'react';

/**
 * India's National Air Quality Index bands (CPCB), the public standard AeroSense maps
 * predictions onto. Reference data about the standard, not measurements from the project.
 */
const bands = [
  { name: 'Good', range: '0–50', color: '#2E9E6A', impact: 'Minimal impact.' },
  { name: 'Satisfactory', range: '51–100', color: '#8DC63F', impact: 'Minor breathing discomfort for sensitive people.' },
  { name: 'Moderate', range: '101–200', color: '#E8C547', impact: 'Breathing discomfort for people with lung disease such as asthma, and discomfort for people with heart disease, children and older adults.' },
  { name: 'Poor', range: '201–300', color: '#E8893A', impact: 'Breathing discomfort for most people on prolonged exposure.' },
  { name: 'Very poor', range: '301–400', color: '#D9473F', impact: 'Respiratory illness on prolonged exposure.' },
  { name: 'Severe', range: '401–500', color: '#A3303B', impact: 'Affects healthy people and seriously impacts people with existing diseases.' },
] as const;

export function AqiBands() {
  const [selected, setSelected] = useState<(typeof bands)[number]['name']>('Moderate');
  const band = bands.find((entry) => entry.name === selected) ?? bands[0];

  return (
    <div>
      <div className="grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-3 md:grid-cols-6" role="group" aria-label="CPCB AQI bands">
        {bands.map((entry) => {
          const active = entry.name === selected;
          return (
            <button
              key={entry.name}
              type="button"
              aria-pressed={active}
              onClick={() => setSelected(entry.name)}
              className={`group min-h-11 rounded-sm border px-2 pb-2 pt-2 text-left transition-colors duration-fast ${
                active ? 'border-ink-subtle bg-surface-overlay' : 'border-transparent hover:bg-surface-raised'
              }`}
            >
              <span className="block h-1.5 rounded-xs" style={{ backgroundColor: entry.color }} aria-hidden="true" />
              <span className={`mt-2 block text-xs font-medium ${active ? 'text-ink' : 'text-ink-muted'}`}>{entry.name}</span>
              <span className="block font-mono text-[0.6875rem] tabular-nums text-ink-subtle">{entry.range}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 min-h-[3lh] max-w-measure text-sm text-ink-muted" aria-live="polite">
        <span className="font-medium text-ink">{band.name}, AQI {band.range}.</span> {band.impact}
      </p>
    </div>
  );
}
