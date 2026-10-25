import { contactResponseSchema, type ContactInput, type NotificationStatus } from '@karna/shared';

export type ContactField = 'name' | 'email' | 'subject' | 'message';
export const contactFields: ContactField[] = ['name', 'email', 'subject', 'message'];

export type SubmitOutcome =
  /** The API saved the message. */
  | { kind: 'saved'; notification: NotificationStatus; message: string }
  /** The API answered and did not save it. */
  | { kind: 'not-saved'; message: string; fieldErrors: Partial<Record<ContactField, string>>; retryAfterSeconds: number | null }
  /** No trustworthy answer arrived, so the message may or may not be saved. */
  | { kind: 'uncertain' };

/**
 * The public API origin is baked in at build time. Development falls back to the local API;
 * a production build without it has no endpoint rather than posting to the visitor's own machine.
 */
export function contactEndpoint(): string | null {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL
    || (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '');
  return base ? `${base.replace(/\/+$/, '')}/api/contact` : null;
}

/** 32 random hex characters; works on plain-HTTP origins where crypto.randomUUID is unavailable. */
export function newIdempotencyKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function retryAfter(response: Response): number | null {
  const value = Number(response.headers.get('retry-after'));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export async function submitContact(
  endpoint: string,
  payload: ContactInput,
  idempotencyKey: string,
  signal: AbortSignal,
): Promise<SubmitOutcome> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(payload),
      signal,
    });
  } catch {
    return { kind: 'uncertain' };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    // An HTML error page from a proxy says nothing about whether the API saved the message.
    return { kind: 'uncertain' };
  }
  const parsed = contactResponseSchema.safeParse(body);
  if (!parsed.success) return { kind: 'uncertain' };

  const result = parsed.data;
  if (result.received) {
    return response.ok ? { kind: 'saved', notification: result.notification, message: result.message } : { kind: 'uncertain' };
  }

  const fieldErrors: Partial<Record<ContactField, string>> = {};
  for (const field of contactFields) {
    const first = result.errors?.[field]?.[0];
    if (first) fieldErrors[field] = first;
  }
  return { kind: 'not-saved', message: result.message, fieldErrors, retryAfterSeconds: response.status === 429 ? retryAfter(response) : null };
}
