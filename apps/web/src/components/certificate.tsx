'use client';

import { useRef } from 'react';
import Image from 'next/image';
import type { Asset } from '@karna/shared';

export function Certificate({ asset, title }: { asset: Asset; title: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  return <div className="certificate">
    <Image src={asset.path} alt={asset.alt} width={asset.width} height={asset.height} loading="lazy" className="certificate-thumbnail" />
    <button className="text-link" type="button" ref={trigger} onClick={() => dialog.current?.showModal()}>View certificate <span className="sr-only">for {title}</span> ↗</button>
    <dialog ref={dialog} aria-label={`${title} certificate`} onClose={() => trigger.current?.focus()} className="certificate-dialog">
      <button autoFocus className="button button-outline dialog-close" onClick={() => dialog.current?.close()}>Close certificate ×</button>
      <Image src={asset.path} alt={asset.alt} width={asset.width} height={asset.height} className="certificate-full" />
    </dialog>
  </div>;
}
