'use client';

import { useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { contactSchema, contactFieldLimits } from '@karna/shared';

type Field = 'name' | 'email' | 'subject' | 'message';
const fields: Field[] = ['name', 'email', 'subject', 'message'];
const subscribeHydration = () => () => {};
export function ContactForm({ emailHref }: { emailHref: string }) {
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [status, setStatus] = useState('');
  const [failed, setFailed] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingRef.current) return;
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form));
    const parsed = contactSchema.safeParse(payload);
    setStatus(''); setFailed(false);
    if (!parsed.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as Field;
        if (fields.includes(field)) next[field] ??= issue.message;
      }
      setErrors(next);
      (form.elements.namedItem(Object.keys(next)[0]) as HTMLElement | null)?.focus();
      return;
    }
    setErrors({}); setPending(true); pendingRef.current = true;
    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
      const response = await fetch(`${api.replace(/\/$/, '')}/api/contact`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data), signal: AbortSignal.timeout(30000),
      });
      const result = await response.json();
      if (!response.ok || result.received !== true) {
        const next: Partial<Record<Field, string>> = {};
        for (const field of fields) {
          if (Array.isArray(result.errors?.[field])) next[field] = result.errors[field][0];
        }
        setErrors(next);
        if (Object.keys(next).length) (form.elements.namedItem(Object.keys(next)[0]) as HTMLElement | null)?.focus();
        throw new Error(typeof result.message === 'string' ? result.message : 'Your message could not be saved. Please contact me by email.');
      }
      const accepted = result.notification === 'accepted';
      setStatus(accepted
        ? 'Your message was received and saved. The email notification was accepted by SMTP; inbox delivery is not confirmed.'
        : 'Your message was received and saved, but the email notification is unavailable or unconfirmed. Please email me directly for urgent enquiries.');
      form.reset();
    } catch (error) {
      setFailed(true);
      setStatus(error instanceof Error && !['TimeoutError', 'TypeError', 'SyntaxError'].includes(error.name)
        ? error.message
        : 'Receipt could not be confirmed. Your message is still here. Please email me directly before retrying.');
    } finally { setPending(false); pendingRef.current = false; }
  }

  return <form method="post" onSubmit={submit} noValidate className="contact-form" aria-label="Contact Karna" aria-busy={pending}>
    <div className="form-grid">
      {fields.map(field => <div className={`field ${field === 'subject' || field === 'message' ? 'field-wide' : ''}`} key={field}>
        <label htmlFor={`contact-${field}`}>{field[0].toUpperCase() + field.slice(1)}</label>
        {field === 'message'
          ? <textarea id={`contact-${field}`} name={field} rows={5} required minLength={10} maxLength={5000} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `${field}-error` : undefined} />
          : <input id={`contact-${field}`} name={field} type={field === 'email' ? 'email' : 'text'} autoComplete={field === 'name' ? 'name' : field === 'email' ? 'email' : 'off'} required maxLength={contactFieldLimits[field].max} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `${field}-error` : undefined} />}
        {errors[field] && <p className="field-error" id={`${field}-error`} role="alert">{errors[field]}</p>}
      </div>)}
    </div>
    <div className="honeypot" aria-hidden="true"><label htmlFor="website">Leave this field empty</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
    <p className="privacy-note">Your name, email, and message are used only to respond to your enquiry.</p>
    <button className="button button-primary send-button" disabled={pending || !hydrated} type="submit">{pending ? 'Sending…' : 'Send message'} <span aria-hidden="true">↗</span></button>
    <p role="status" aria-live="polite" aria-atomic="true" className={`form-status ${failed ? 'has-error' : ''}`}>{status}</p>
    {failed && <a className="text-link" href={emailHref}>Email Karna directly ↗</a>}
    <noscript><p>The form needs JavaScript to send a message. <a href={emailHref}>Email Karna directly</a>.</p></noscript>
  </form>;
}
