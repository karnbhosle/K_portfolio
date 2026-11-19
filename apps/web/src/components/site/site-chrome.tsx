'use client';

import { useRef, useState } from 'react';
import { ReactorMark } from '@/components/reactor/arc-reactor';
import { ArrowRight, Close, GitHub, Menu } from '@/components/ui/icons';
import { sectionIds, sections } from '@/lib/sections';
import { order } from '@/lib/style';
import { CommandPalette, PaletteTrigger, type PaletteLinks } from './command-palette';
import { MotionToggle, ReplayIntroButton } from './preference-controls';
import { useActiveSection } from './use-active-section';

/** One fixed top bar for every width: inline section links from 1024px, a full-screen menu dialog below. */
export function SiteChrome({ name, role, footnote, links }: { name: string; role: string; footnote: string; links: PaletteLinks }) {
  const active = useActiveSection(sectionIds);
  const current = sections.find((section) => section.id === active) ?? sections[0];
  const dialog = useRef<HTMLDialogElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const navigating = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const openMenu = () => {
    dialog.current?.showModal();
    setMenuOpen(true);
  };
  const closeMenu = (forNavigation = false) => {
    navigating.current = forNavigation;
    dialog.current?.close();
  };

  return (
    <>
      <header className="topbar no-print fixed inset-x-0 top-0 z-chrome">
        <div className="shell flex h-bar items-center justify-between gap-4">
          <a href="#know-karna" className="flex min-h-11 min-w-0 shrink-0 items-center gap-3 rounded-sm" aria-label={`${name}, back to top`}>
            <ReactorMark size={28} />
            <span className="min-w-0 lg:hidden xl:block">
              <span className="block truncate font-display text-[0.9375rem] font-semibold leading-tight text-ink">{name}</span>
              <span className="hidden truncate font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-subtle 2xl:block">{role}</span>
            </span>
          </a>

          <nav aria-label="Sections" className="hidden lg:block">
            <ol className="flex items-center rounded-md border border-line bg-black/50 p-1 backdrop-blur-sm">
              {sections.map((section) => {
                const isActive = section.id === active;
                return (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      aria-current={isActive ? 'location' : undefined}
                      className={`nav-link flex h-9 items-center gap-2 whitespace-nowrap rounded-sm px-3 text-[0.8125rem] font-medium transition-colors duration-fast ${
                        isActive ? 'bg-surface-overlay text-ink' : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      <span className={`hidden font-mono text-[0.6875rem] tabular-nums 2xl:inline ${isActive ? 'text-cyan' : 'text-ink-subtle'}`}>{section.index}</span>
                      {section.label}
                    </a>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="hidden shrink-0 items-center gap-1 lg:flex">
            <PaletteTrigger className="mr-1" />
            {links.github ? (
              <a href={links.github} target="_blank" rel="noopener noreferrer" className="btn-icon" title="GitHub">
                <GitHub size={17} /><span className="sr-only">GitHub profile (opens in a new tab)</span>
              </a>
            ) : null}
            <MotionToggle compact />
            <ReplayIntroButton compact />
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            <span className="hidden font-mono text-xs text-ink-subtle sm:inline" aria-hidden="true">
              <span className="text-cyan">{current.index}</span> {current.label}
            </span>
            <button
              ref={menuButton}
              type="button"
              className="btn btn-quiet"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              onClick={openMenu}
            >
              <Menu size={20} /> Menu
            </button>
          </div>
        </div>
        <span className="scroll-progress absolute inset-x-0 bottom-[-1px] h-px bg-gradient-to-r from-cyan/0 via-cyan to-cyan" aria-hidden="true" />
      </header>

      <dialog
        id="site-menu"
        ref={dialog}
        aria-label="Site menu"
        className="menu-dialog fixed inset-0 m-0 h-[100dvh] max-h-none w-full max-w-none overflow-y-auto overscroll-contain border-0 bg-void p-0 text-ink lg:hidden"
        onClose={() => {
          setMenuOpen(false);
          if (!navigating.current) menuButton.current?.focus();
          navigating.current = false;
        }}
      >
        <div className="flex min-h-full flex-col px-5 pb-8 sm:px-8">
          <div className="flex h-bar items-center justify-between">
            <span className="flex items-center gap-2.5">
              <ReactorMark size={26} />
              <span className="font-display text-base font-semibold">{name}</span>
            </span>
            <button type="button" className="btn btn-quiet -mr-2" aria-label="Close menu" onClick={() => closeMenu()}>
              <Close size={20} /> Close
            </button>
          </div>
          <nav aria-label="Sections" className="mt-6">
            <ol className="divide-y divide-line border-y border-line">
              {sections.map((section, index) => (
                <li key={section.id} data-menu-item style={order(index)}>
                  <a
                    href={`#${section.id}`}
                    aria-current={section.id === active ? 'location' : undefined}
                    onClick={() => closeMenu(true)}
                    className="group flex min-h-16 items-center gap-4 py-2 font-display text-[1.75rem] font-medium tracking-tight text-ink"
                  >
                    <span className={`w-7 font-mono text-sm tabular-nums ${section.id === active ? 'text-cyan' : 'text-ink-subtle'}`}>{section.index}</span>
                    {section.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="mt-8" data-menu-item style={order(sections.length)}>
            <a href="#contact" className="btn btn-primary w-full" onClick={() => closeMenu(true)}>Contact me <ArrowRight size={17} /></a>
          </div>
          <div className="mt-auto pt-8" data-menu-item style={order(sections.length + 1)}>
            <div className="-mx-3 flex flex-wrap">
              <MotionToggle />
              <ReplayIntroButton onReplay={() => closeMenu(true)} />
            </div>
            <p className="mt-4 font-mono text-xs text-ink-subtle">{footnote}</p>
          </div>
        </div>
      </dialog>

      <CommandPalette links={links} />
    </>
  );
}
