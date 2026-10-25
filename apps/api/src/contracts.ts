import type { ContactInput, NotificationStatus } from '@karna/shared';

export type { NotificationStatus };
export type StoredContact = Omit<ContactInput, 'website'>;

/** Links a saved message to the Idempotency-Key that created it. */
export interface ContactReceiptKey {
  idempotencyKey: string;
  fingerprint: string;
}

export interface ContactReceiptRecord {
  id: string;
  notificationStatus: NotificationStatus;
  fingerprint: string | null;
}

/** A saved message whose email notification is due for another attempt. */
export interface NotificationJob {
  id: string;
  contact: StoredContact;
  /** SMTP attempts already made before this claim. */
  attempts: number;
}

export interface NotificationClaim {
  now: Date;
  maxAttempts: number;
  /** `pending` records last touched before this instant are treated as interrupted. */
  stalePendingBefore: Date;
}

/** Thrown when a concurrent request already saved a message under the same Idempotency-Key. */
export class DuplicateReceiptError extends Error {
  constructor() {
    super('A message with this idempotency key already exists.');
    this.name = 'DuplicateReceiptError';
  }
}

export interface ContactRepository {
  isReady(): boolean;
  getPortfolio(): Promise<unknown | null>;
  createContact(contact: StoredContact, status: NotificationStatus, receipt?: ContactReceiptKey): Promise<string>;
  findContactByIdempotencyKey(key: string): Promise<ContactReceiptRecord | null>;
  /** Saves the outcome of one SMTP attempt and counts it. */
  recordNotificationAttempt(id: string, status: NotificationStatus, nextAttemptAt: Date | null): Promise<void>;
  claimNotificationRetry(claim: NotificationClaim): Promise<NotificationJob | null>;
}

export interface ContactNotifier {
  configured: boolean;
  send(contact: StoredContact): Promise<void>;
}

export type LogDetails = Record<string, string | number | boolean | null>;

/** Receives event codes and non-identifying details only: never message bodies, addresses or secrets. */
export type SafeLogger = (event: string, details?: LogDetails) => void;
