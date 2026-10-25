'use client';

import Image from 'next/image';
import { useId, useRef } from 'react';
import type { Asset } from '@karna/shared';
import { Close } from '@/components/ui/icons';

/** Shows a supplied certificate in a native modal dialog: Escape, focus trap and focus return come built in. */
export function CertificateButton({ certificate, title }: { certificate: Asset; title: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const headingId = useId();

  return (
    <>
      <button ref={trigger} type="button" className="text-link mt-4 inline-flex min-h-11 items-center text-sm" onClick={() => dialog.current?.showModal()}>
        View certificate
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={headingId}
        className="m-auto max-h-[90dvh] w-[min(64rem,94vw)] overflow-y-auto overscroll-contain rounded-lg border border-line-strong bg-surface p-0 text-ink"
        onClose={() => trigger.current?.focus()}
        onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}
      >
        <div className="sticky top-0 flex items-center justify-between gap-4 border-b border-line bg-surface px-5 py-3">
          <h2 id={headingId} className="font-display text-lg font-medium">{title}</h2>
          <button type="button" className="btn btn-quiet" onClick={() => dialog.current?.close()}>
            <Close size={18} /> Close
          </button>
        </div>
        <div className="p-5">
          <Image src={certificate.path} alt={certificate.alt} width={certificate.width} height={certificate.height} sizes="94vw" className="h-auto w-full" />
        </div>
      </dialog>
    </>
  );
}
