import type { ContactInput } from '@karna/shared';

export type NotificationStatus = 'pending' | 'accepted' | 'failed' | 'not_configured';
export type StoredContact = Omit<ContactInput, 'website'>;

export interface ContactRepository {
  isReady(): boolean;
  getPortfolio(): Promise<unknown | null>;
  createContact(contact: StoredContact, status: NotificationStatus): Promise<string>;
  updateNotification(id: string, status: NotificationStatus): Promise<void>;
}

export interface ContactNotifier {
  configured: boolean;
  send(contact: StoredContact): Promise<void>;
}

export type SafeLogger = (event: string) => void;
