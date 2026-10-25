'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from '@/components/ui/icons';
import { useHydrated } from '@/lib/preferences';

/** Copies the address for visitors whose device has no mail app configured. */
export function CopyEmail({ email }: { email: string }) {
  const hydrated = useHydrated();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!hydrated) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      return;
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" onClick={copy} className="btn btn-quiet shrink-0" aria-label={copied ? 'Email address copied' : `Copy ${email}`}>
      <span className="relative inline-flex h-4 w-4">
        <Copy size={16} className={`absolute inset-0 transition-[opacity,transform] duration-slow ease-out ${copied ? 'scale-50 opacity-0' : 'opacity-100'}`} />
        <Check size={16} className={`absolute inset-0 text-cyan transition-[opacity,transform] duration-slow ease-out ${copied ? 'opacity-100' : 'scale-50 opacity-0'}`} />
      </span>
      <span aria-hidden="true">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}
