'use client';

import { useRef, useState } from 'react';
import { ReactorMark } from '@/components/reactor/arc-reactor';
import { Close, Menu } from '@/components/ui/icons';
import { sectionIds, sections } from '@/lib/sections';
import { order } from '@/lib/style';
import { MotionToggle, ReplayIntroButton } from './preference-controls';
import { useActiveSection } from './use-active-section';

/** Desktop rail, mobile top bar and the mobile menu dialog, sharing one active-section tracker. */
export function SiteChrome({ name, role, footnote }: { name: string; role: string; footnote: string }) {
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
      <aside className="no-print fixed inset-y-0 left-0 z-chrome hidden w-sidebar flex-col border-r border-line bg-void lg:flex" aria-label="Site">
        <a href="#know-karna" className="mx-3 mt-6 flex items-center gap-3 rounded-sm px-3 py-2">
          <ReactorMark size={30} />
          <span className="min-w-0">
            <span className="block font-display text-base font-semibold leading-tight text-ink">{name}</span>
            <span className="mt-0.5 block text-xs leading-snug text-ink-subtle">{role}</span>
          </span>
        </a>

        <nav aria-label="Sections" className="mt-10 px-3">
          <ol className="space-y-0.5">
            {sections.map((section) => {
              const isActive = section.id === active;
              return (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    aria-current={isActive ? 'location' : undefined}
                    className={`group relative flex min-h-11 items-center gap-3.5 rounded-sm px-3 text-[0.9375rem] transition-colors duration-fast ${
                      isActive ? 'bg-surface-raised text-ink' : 'text-ink-muted hover:bg-surface hover:text-ink'
                    }`}
                  >
                    <span className={`font-mono text-xs tabular-nums ${isActive ? 'text-cyan' : 'text-ink-subtle'}`}>{section.index}</span>
                    {section.label}
                    {isActive ? <span className="absolute inset-y-2.5 left-0 w-0.5 rounded-full bg-cyan" aria-hidden="true" /> : null}
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="mt-auto space-y-5 px-6 pb-6">
          <a href="#contact" className="btn btn-secondary w-full">Contact me</a>
          <div className="-mx-3 flex flex-col items-start">
            <MotionToggle />
            <ReplayIntroButton />
          </div>
          <p className="font-mono text-xs text-ink-subtle">{footnote}</p>
        </div>
      </aside>

      <header className="no-print sticky top-0 z-chrome flex h-bar items-center justify-between gap-3 border-b border-line bg-void/90 pl-4 pr-2 backdrop-blur-md supports-[backdrop-filter]:bg-void/75 sm:pl-6 sm:pr-4 lg:hidden">
        <a href="#know-karna" className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-sm">
          <ReactorMark size={24} />
          <span className="truncate font-display text-base font-semibold text-ink">{name}</span>
        </a>
        <div className="flex items-center gap-1">
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
              <ReactorMark size={24} />
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
                    className="flex min-h-14 items-center gap-4 py-2 font-display text-2xl font-medium text-ink"
                  >
                    <span className={`font-mono text-sm tabular-nums ${section.id === active ? 'text-cyan' : 'text-ink-subtle'}`}>{section.index}</span>
                    {section.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="mt-8" data-menu-item style={order(sections.length)}>
            <a href="#contact" className="btn btn-primary w-full" onClick={() => closeMenu(true)}>Contact me</a>
          </div>
          <div className="-mx-3 mt-auto flex flex-wrap pt-8" data-menu-item style={order(sections.length + 1)}>
            <MotionToggle />
            <ReplayIntroButton onReplay={() => closeMenu(true)} />
          </div>
        </div>
      </dialog>
    </>
  );
}
