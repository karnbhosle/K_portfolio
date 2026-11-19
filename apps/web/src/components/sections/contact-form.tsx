'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { contactFieldLimits, contactSchema, type NotificationStatus } from '@karna/shared';
import { Alert, ArrowRight, Check } from '@/components/ui/icons';
import { contactEndpoint, contactFields, newIdempotencyKey, submitContact, type ContactField } from '@/lib/contact-client';
import { storageKeys } from '@/lib/boot';
import { read, store, useHydrated } from '@/lib/preferences';

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'saved'; notification: NotificationStatus; message: string }
  | { kind: 'not-saved'; message: string; retryAfterSeconds: number | null }
  | { kind: 'uncertain' };

const endpoint = contactEndpoint();
// Deliberately not "website" or "url": names like those invite browser autofill into the trap.
const honeypotName = 'hp_extra_notes';
const messageMax = contactFieldLimits.message.max;
const numberFormat = new Intl.NumberFormat('en-IN');

export function ContactForm({ email, emailHref }: { email: string; emailHref: string }) {
  const hydrated = useHydrated();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [errors, setErrors] = useState<Partial<Record<ContactField, string>>>({});
  const [messageLength, setMessageLength] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  // Reusing the key for an unchanged retry lets the API replay its receipt instead of saving twice.
  const attempt = useRef<{ key: string; fingerprint: string } | null>(null);
  const draftTimer = useRef<number | undefined>(undefined);
  const ids = useId();
  const sending = status.kind === 'sending';

  // Restore an unsent draft, for example after the visitor switched apps and the tab reloaded.
  useEffect(() => {
    const form = formRef.current;
    const saved = read(storageKeys.draft, true);
    if (!form || !saved) return;
    try {
      const draft = JSON.parse(saved) as Partial<Record<ContactField, string>>;
      for (const field of contactFields) {
        const input = form.elements.namedItem(field);
        if (typeof draft[field] === 'string' && (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) && !input.value) {
          input.value = draft[field];
        }
      }
      // Lets the onInput handler refresh the character count for the restored message.
      const message = form.elements.namedItem('message');
      if (message instanceof HTMLTextAreaElement) message.dispatchEvent(new Event('input', { bubbles: true }));
    } catch {
      store(storageKeys.draft, null, true);
    }
    return () => window.clearTimeout(draftTimer.current);
  }, []);

  function saveDraft(form: HTMLFormElement) {
    window.clearTimeout(draftTimer.current);
    draftTimer.current = window.setTimeout(() => {
      const values = Object.fromEntries(contactFields.map((field) => [field, String(new FormData(form).get(field) ?? '')]));
      store(storageKeys.draft, Object.values(values).some(Boolean) ? JSON.stringify(values) : null, true);
    }, 300);
  }

  function focusField(form: HTMLFormElement, field: ContactField | undefined) {
    if (field) (form.elements.namedItem(field) as HTMLElement | null)?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const parsed = contactSchema.safeParse({
      ...Object.fromEntries(contactFields.map((field) => [field, String(data.get(field) ?? '')])),
      website: String(data.get(honeypotName) ?? ''),
    });

    if (!parsed.success) {
      const next: Partial<Record<ContactField, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as ContactField;
        if (contactFields.includes(field)) next[field] ??= issue.message;
      }
      setErrors(next);
      setStatus({ kind: 'idle' });
      focusField(form, contactFields.find((field) => next[field]));
      return;
    }
    setErrors({});
    // The hidden honeypot is meant for bots. Say so plainly in case a person's autofill reached it.
    if (parsed.data.website) {
      setStatus({ kind: 'not-saved', message: 'This message could not be sent from the form.', retryAfterSeconds: null });
      return;
    }
    if (!endpoint) {
      setStatus({ kind: 'not-saved', message: 'The message form is not connected on this site yet. Please email Karna directly.', retryAfterSeconds: null });
      return;
    }

    const { name, email: replyTo, subject, message } = parsed.data;
    const fingerprint = JSON.stringify([name, replyTo, subject, message]);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { key: newIdempotencyKey(), fingerprint };

    setStatus({ kind: 'sending' });
    const outcome = await submitContact(endpoint, parsed.data, attempt.current.key, AbortSignal.timeout(30_000));

    if (outcome.kind === 'saved') {
      attempt.current = null;
      form.reset();
      setMessageLength(0);
      store(storageKeys.draft, null, true);
      setStatus({ kind: 'saved', notification: outcome.notification, message: outcome.message });
    } else if (outcome.kind === 'not-saved') {
      setErrors(outcome.fieldErrors);
      setStatus({ kind: 'not-saved', message: outcome.message, retryAfterSeconds: outcome.retryAfterSeconds });
      focusField(form, contactFields.find((field) => outcome.fieldErrors[field]));
    } else {
      setStatus({ kind: 'uncertain' });
    }
  }

  const describedBy = (field: ContactField, hint?: string) =>
    [hint, errors[field] ? `${ids}-${field}-error` : undefined].filter(Boolean).join(' ') || undefined;

  return (
    <form
      ref={formRef}
      method="post"
      noValidate
      onSubmit={handleSubmit}
      onInput={(event) => {
        const target = event.target;
        if (target instanceof HTMLTextAreaElement && target.name === 'message') setMessageLength(target.value.length);
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
          if (errors[target.name as ContactField]) setErrors((current) => ({ ...current, [target.name]: undefined }));
        }
        saveDraft(event.currentTarget);
      }}
      className="panel frame-ticks spot p-6 sm:p-10"
    >
      <h3 className="font-display text-2xl font-medium tracking-tight text-ink">Send a message</h3>
      <p className="mt-1.5 text-sm text-ink-muted">Tell me about the role or project. For anything urgent, email is fastest.</p>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <Field id={`${ids}-name`} label="Name" error={errors.name} errorId={`${ids}-name-error`}>
          <input
            id={`${ids}-name`} name="name" type="text" autoComplete="name" required
            maxLength={contactFieldLimits.name.max} placeholder="Priya Sharma"
            aria-invalid={Boolean(errors.name)} aria-describedby={describedBy('name')} className="field"
          />
        </Field>
        <Field id={`${ids}-email`} label="Email" error={errors.email} errorId={`${ids}-email-error`}>
          <input
            id={`${ids}-email`} name="email" type="email" autoComplete="email" inputMode="email" spellCheck={false} required
            maxLength={contactFieldLimits.email.max} placeholder="name@company.com"
            aria-invalid={Boolean(errors.email)} aria-describedby={describedBy('email')} className="field"
          />
        </Field>
      </div>

      <div className="mt-5 space-y-5">
        <Field id={`${ids}-subject`} label="Subject" error={errors.subject} errorId={`${ids}-subject-error`}>
          <input
            id={`${ids}-subject`} name="subject" type="text" required
            maxLength={contactFieldLimits.subject.max} placeholder="Backend engineering role"
            aria-invalid={Boolean(errors.subject)} aria-describedby={describedBy('subject')} className="field"
          />
        </Field>
        <Field
          id={`${ids}-message`}
          label="Message"
          error={errors.message}
          errorId={`${ids}-message-error`}
          aside={<span id={`${ids}-count`} className="font-mono text-xs tabular-nums text-ink-subtle">{numberFormat.format(messageLength)} / {numberFormat.format(messageMax)}</span>}
        >
          <textarea
            id={`${ids}-message`} name="message" rows={6} required
            minLength={contactFieldLimits.message.min} maxLength={messageMax}
            placeholder="Hi Karna, I'd like to talk about…"
            aria-invalid={Boolean(errors.message)} aria-describedby={describedBy('message', `${ids}-count`)} className="field min-h-36 resize-y"
          />
        </Field>
      </div>

      {/* Honeypot: hidden from people and assistive technology, tempting to form-filling bots. */}
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor={`${ids}-hp`}>Leave this field empty</label>
        <input id={`${ids}-hp`} name={honeypotName} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div className="mt-7 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p id={`${ids}-privacy`} className="text-caption text-ink-subtle">Your details are only used to reply to you.</p>
        <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={!hydrated || sending}>
          {sending ? 'Sending…' : <>Send message <ArrowRight size={17} /></>}
        </button>
      </div>
      <noscript>
        <p className="mt-4 text-sm text-ink-muted">
          The form needs JavaScript. You can still email <a className="text-link" href={emailHref}>{email}</a>.
        </p>
      </noscript>

      {/* Always rendered, even when empty, so screen readers announce each new status. */}
      <div role="status" className="[&:not(:empty)]:mt-6">
        <StatusMessage status={status} email={email} emailHref={emailHref} />
      </div>
    </form>
  );
}

function Field({ id, label, error, errorId, aside, children }: {
  id: string; label: string; error?: string; errorId: string; aside?: ReactNode; children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={errorId} className="mt-2 flex items-start gap-1.5 text-sm text-danger">
          <Alert size={16} className="mt-0.5 shrink-0" /> {error}
        </p>
      ) : null}
    </div>
  );
}

function StatusMessage({ status, email, emailHref }: { status: Status; email: string; emailHref: string }) {
  const directLink = <a className="text-link" href={emailHref}>Email Karna directly</a>;
  switch (status.kind) {
    case 'idle':
      return null;
    case 'sending':
      return <p className="text-sm text-ink-muted">Sending your message…</p>;
    case 'saved':
      return (
        <div className="rounded-md border border-cyan-line bg-cyan-soft p-4 text-sm">
          <p className="flex items-center gap-2 font-medium text-ink"><Check size={16} className="text-cyan" /> Message received</p>
          <p className="mt-1.5 text-ink-muted">{status.message}</p>
          {status.notification !== 'accepted' ? <p className="mt-2">{directLink}: {email}</p> : null}
        </div>
      );
    case 'not-saved':
      return (
        <div className="rounded-md border border-danger-line bg-danger-soft p-4 text-sm">
          <p className="flex items-center gap-2 font-medium text-ink"><Alert size={16} className="text-danger" /> Message not sent</p>
          <p className="mt-1.5 text-ink-muted">
            {status.message}
            {status.retryAfterSeconds ? ` You can try again in about ${Math.max(1, Math.ceil(status.retryAfterSeconds / 60))} minutes.` : ''}
          </p>
          <p className="mt-2">{directLink}: {email}</p>
        </div>
      );
    case 'uncertain':
      return (
        <div className="rounded-md border border-copper-line bg-copper-soft p-4 text-sm">
          <p className="flex items-center gap-2 font-medium text-ink"><Alert size={16} className="text-copper" /> Delivery could not be confirmed</p>
          <p className="mt-1.5 text-ink-muted">
            Your message is still here. Sending it again is safe: it won&rsquo;t create a duplicate. If it fails again, please email instead.
          </p>
          <p className="mt-2">{directLink}: {email}</p>
        </div>
      );
  }
}
