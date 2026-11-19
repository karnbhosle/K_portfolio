'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ArrowUpRight, Check, Code, Copy, Enter, GitHub, Hash, Mail, Pause, Phone, Play, Replay, Search } from '@/components/ui/icons';
import { sections } from '@/lib/sections';
import { getIntroPhase, getMotion, replayIntroEvent, setMotion, useMotion } from '@/lib/preferences';

export interface PaletteLinks {
  email: string;
  emailHref: string;
  phoneHref: string;
  phoneDisplay: string;
  github: string | null;
  repositories: Array<{ name: string; url: string }>;
}

interface Command {
  id: string;
  group: 'Jump to' | 'Contact' | 'Code' | 'Preferences';
  label: string;
  hint?: string;
  icon: ReactNode;
  keywords?: string;
  action:
    | { type: 'jump'; target: string }
    | { type: 'copy' }
    | { type: 'href'; href: string }
    | { type: 'external'; url: string }
    | { type: 'motion' }
    | { type: 'replay' };
}

export const openPaletteEvent = 'karna:open-palette';

const noopSubscribe = () => () => {};
function useIsApple() {
  return useSyncExternalStore(noopSubscribe, () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent), () => false);
}

/** The palette's trigger, shown in the desktop top bar. */
export function PaletteTrigger({ className = '' }: { className?: string }) {
  const apple = useIsApple();
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(openPaletteEvent))}
      className={`group inline-flex h-10 items-center gap-2.5 rounded-sm border border-line-strong bg-black/40 pl-3 pr-2 text-sm text-ink-muted transition-colors duration-fast hover:border-cyan-line hover:text-ink ${className}`}
      aria-keyshortcuts={apple ? 'Meta+K' : 'Control+K'}
    >
      <Search size={16} />
      <span className="hidden xl:inline">Quick jump</span>
      <span className="sr-only xl:hidden">Quick jump</span>
      <span className="flex gap-0.5" aria-hidden="true">
        <kbd className="kbd">{apple ? '⌘' : 'Ctrl'}</kbd><kbd className="kbd">K</kbd>
      </span>
    </button>
  );
}

/**
 * A keyboard-first launcher: jump to any section, copy the email, open the repositories or change
 * motion. It follows the ARIA combobox-with-listbox pattern inside a native modal dialog.
 */
export function CommandPalette({ links }: { links: PaletteLinks }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [notice, setNotice] = useState('');
  const motion = useMotion();
  const ids = useId();
  const listId = `${ids}-list`;

  const close = useCallback(() => dialog.current?.close(), []);

  const open = useCallback(() => {
    const element = dialog.current;
    if (!element || element.open || getIntroPhase()) return;
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setQuery('');
    setActive(0);
    setNotice('');
    element.showModal();
    input.current?.focus();
  }, []);

  // Commands are plain data; runCommand (an event handler) carries them out.
  const commands = useMemo<Command[]>(() => {
    const list: Command[] = sections.map((section) => ({
      id: `section-${section.id}`,
      group: 'Jump to',
      label: section.label,
      hint: section.index,
      icon: <Hash size={16} />,
      action: { type: 'jump', target: section.id },
    }));
    list.push(
      { id: 'copy-email', group: 'Contact', label: 'Copy email address', hint: links.email, icon: <Copy size={16} />, keywords: 'mail clipboard', action: { type: 'copy' } },
      { id: 'email', group: 'Contact', label: 'Write an email', hint: 'Opens your mail app', icon: <Mail size={16} />, keywords: 'mail message', action: { type: 'href', href: links.emailHref } },
      { id: 'call', group: 'Contact', label: 'Call Karna', hint: links.phoneDisplay, icon: <Phone size={16} />, keywords: 'phone telephone', action: { type: 'href', href: links.phoneHref } },
    );
    if (links.github) {
      list.push({ id: 'github', group: 'Code', label: 'GitHub profile', hint: new URL(links.github).pathname.slice(1), icon: <GitHub size={16} />, action: { type: 'external', url: links.github } });
    }
    for (const repository of links.repositories) {
      list.push({ id: `repo-${repository.name}`, group: 'Code', label: `${repository.name} repository`, hint: 'GitHub', icon: <Code size={16} />, keywords: 'source code project', action: { type: 'external', url: repository.url } });
    }
    list.push(
      { id: 'motion', group: 'Preferences', label: motion === 'on' ? 'Pause motion' : 'Enable motion', icon: motion === 'on' ? <Pause size={16} /> : <Play size={16} />, keywords: 'animation reduce accessibility', action: { type: 'motion' } },
      { id: 'replay', group: 'Preferences', label: 'Replay intro', icon: <Replay size={16} />, keywords: 'reactor ignition', action: { type: 'replay' } },
    );
    return list;
  }, [links, motion]);

  const results = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return commands;
    return commands.filter((command) => {
      const haystack = `${command.label} ${command.hint ?? ''} ${command.group} ${command.keywords ?? ''}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [commands, query]);

  const current = Math.min(active, Math.max(0, results.length - 1));

  // Global shortcuts: Ctrl/⌘+K anywhere, "/" when not typing.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (dialog.current?.open) close();
        else open();
        return;
      }
      const target = event.target;
      const typing = target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"], dialog[open]');
      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(openPaletteEvent, open);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(openPaletteEvent, open);
    };
  }, [close, open]);

  // Keep the active option in view while moving with the arrow keys.
  useEffect(() => {
    document.getElementById(`${ids}-option-${current}`)?.scrollIntoView({ block: 'nearest' });
  }, [current, ids]);

  async function runCommand(command: Command | undefined) {
    if (!command) return;
    const { action } = command;
    if (action.type === 'copy') {
      try {
        await navigator.clipboard.writeText(links.email);
        setNotice(`Copied ${links.email}`);
        window.setTimeout(close, 900);
      } catch {
        setNotice(`Copying is blocked here. The address is ${links.email}.`);
      }
      return;
    }
    close();
    if (action.type === 'jump') {
      const target = document.getElementById(action.target);
      if (!target) return;
      history.pushState(null, '', `#${action.target}`);
      target.scrollIntoView({ behavior: getMotion() === 'on' ? 'smooth' : 'auto', block: 'start' });
      const heading = document.getElementById(`${action.target}-title`);
      if (heading) {
        if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
    } else if (action.type === 'href') {
      window.location.href = action.href;
    } else if (action.type === 'external') {
      window.open(action.url, '_blank', 'noopener,noreferrer');
    } else if (action.type === 'motion') {
      setMotion(motion === 'on' ? 'off' : 'on');
    } else {
      window.setTimeout(() => window.dispatchEvent(new Event(replayIntroEvent)), 50);
    }
  }

  function onInputKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current + 1) % Math.max(1, results.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current - 1 + results.length) % Math.max(1, results.length));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActive(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActive(Math.max(0, results.length - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      void runCommand(results[current]);
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-label="Quick jump"
      className="palette-dialog fixed inset-x-0 top-[12vh] mx-auto my-0 w-[min(40rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-line-strong bg-surface p-0 text-ink shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9),0_0_0_1px_rgba(97,232,255,0.06)]"
      onClose={() => {
        const target = returnFocus.current;
        returnFocus.current = null;
        // A jump moves focus to its section heading; only restore focus when nothing else took it.
        if (target && (document.activeElement === document.body || document.activeElement === null)) target.focus({ preventScroll: true });
      }}
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search size={18} className="shrink-0 text-ink-subtle" />
        <input
          ref={input}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={results.length ? `${ids}-option-${current}` : undefined}
          aria-label="Search sections and actions"
          placeholder="Jump to a section, copy the email, open a repository…"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setActive(0); }}
          onKeyDown={onInputKey}
          className="h-14 min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-ink-subtle focus:outline-none"
        />
        <kbd className="kbd hidden sm:inline-flex">Esc</kbd>
      </div>

      <ul id={listId} role="listbox" aria-label="Results" className="max-h-[min(26rem,60vh)] overflow-y-auto overscroll-contain p-2">
        {results.map((command, index) => {
          const header = index === 0 || results[index - 1]?.group !== command.group ? command.group : null;
          const selected = index === current;
          return (
            <li key={command.id} role="presentation">
              {header ? <p role="presentation" className="label px-3 pb-1.5 pt-3 first:pt-1.5">{header}</p> : null}
              <div
                id={`${ids}-option-${index}`}
                role="option"
                aria-selected={selected}
                onPointerMove={() => { if (!selected) setActive(index); }}
                onClick={() => void runCommand(command)}
                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-3 text-[0.9375rem] ${selected ? 'bg-cyan-soft text-ink' : 'text-ink-muted'}`}
              >
                <span className={selected ? 'text-cyan' : 'text-ink-subtle'} aria-hidden="true">{command.icon}</span>
                <span className="min-w-0 flex-1 truncate">{command.label}</span>
                {command.hint ? <span className="hidden truncate font-mono text-xs text-ink-subtle sm:inline">{command.hint}</span> : null}
                {selected ? <Enter size={15} className="shrink-0 text-cyan" /> : null}
              </div>
            </li>
          );
        })}
        {results.length === 0 ? (
          <li role="presentation" className="px-3 py-8 text-center text-sm text-ink-muted">Nothing matches &ldquo;{query}&rdquo;.</li>
        ) : null}
      </ul>

      <div className="flex items-center justify-between gap-4 border-t border-line px-4 py-2.5 text-xs text-ink-subtle">
        <p role="status" className="flex min-h-5 items-center gap-1.5 text-ink">
          {notice ? <><Check size={14} className="text-cyan" /> {notice}</> : null}
        </p>
        <p className="hidden shrink-0 items-center gap-3 sm:flex" aria-hidden="true">
          <span className="flex items-center gap-1"><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> move</span>
          <span className="flex items-center gap-1"><kbd className="kbd">↵</kbd> open</span>
          <span className="flex items-center gap-1"><ArrowUpRight size={12} /> new tab for links</span>
        </p>
      </div>
    </dialog>
  );
}
