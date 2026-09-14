'use client';

import { useEffect, useRef, useState } from 'react';
import { MotionControls } from './motion-controls';

const sections = [
  ['know-karna', 'Know Karna'], ['qualifications', 'Qualifications'], ['projects', 'Projects'],
  ['technical-skills', 'Technical Skills'], ['activities', 'Activities'], ['contact', 'Contact'],
] as const;

export function Header() {
  const [active, setActive] = useState<string>('know-karna');
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const nodes = sections.map(([id]) => document.getElementById(id)).filter((el): el is HTMLElement => Boolean(el));
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting);
      if (visible.length) setActive(visible[0].target.id);
    }, { rootMargin: '-12% 0px -60% 0px', threshold: 0 });
    nodes.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); menuButton.current?.focus(); } };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open]);

  const links = sections.map(([id, title], index) => <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined} onClick={() => { setActive(id); setOpen(false); }}><span className="nav-node" aria-hidden="true" /><span className="nav-index">0{index + 1}</span>{title}</a>);
  return <header className="site-header">
    <div className="header-inner">
      <a href="#know-karna" className="brand" aria-label="Karna Bhosle, back to top"><span className="brand-mark">KB</span><span>KARNA <span className="brand-slash">/</span> CORE</span></a>
      <nav className="desktop-nav" aria-label="Main navigation">{links}</nav>
      <div className="header-controls"><MotionControls /><button ref={menuButton} type="button" className="menu-button" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>{open ? '×' : '☰'}</button></div>
    </div>
    <nav id="mobile-nav" className="mobile-nav" aria-label="Mobile navigation" hidden={!open}>{links}</nav>
    <noscript><nav className="no-script-nav" aria-label="Section navigation">{sections.map(([id, title]) => <a key={id} href={`#${id}`}>{title}</a>)}</nav></noscript>
  </header>;
}
