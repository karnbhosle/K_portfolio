import mongoose, { Schema } from 'mongoose';
import { notificationStatuses, portfolioSchema, type Portfolio } from '@karna/shared';
import type { NotificationStatus, StoredContact } from './contracts.js';

interface PortfolioRecord {
  key: string;
  content: Portfolio;
}

interface ContactRecord extends StoredContact {
  notificationStatus: NotificationStatus;
  notificationUpdatedAt: Date;
  notificationAttempts: number;
  nextNotificationAt: Date | null;
  idempotencyKey?: string;
  payloadHash?: string;
  createdAt: Date;
}

const portfolioDocumentSchema = new Schema<PortfolioRecord>({
  key: { type: String, required: true, enum: ['main'], unique: true },
  content: {
    type: Schema.Types.Mixed,
    required: true,
    validate: {
      validator: (content: unknown) => portfolioSchema.safeParse(content).success,
      message: 'Portfolio content must match the public content schema.',
    },
  },
}, { timestamps: true, strict: 'throw', bufferCommands: false });

const contactMessageSchema = new Schema<ContactRecord>({
  name: { type: String, required: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, maxlength: 254 },
  subject: { type: String, required: true, minlength: 3, maxlength: 150 },
  message: { type: String, required: true, minlength: 10, maxlength: 5000 },
  notificationStatus: { type: String, required: true, enum: [...notificationStatuses] },
  notificationUpdatedAt: { type: Date, required: true, default: Date.now },
  notificationAttempts: { type: Number, required: true, default: 0, min: 0 },
  nextNotificationAt: { type: Date, default: null },
  idempotencyKey: { type: String, minlength: 16, maxlength: 128 },
  payloadHash: { type: String, minlength: 64, maxlength: 64 },
}, { timestamps: true, strict: 'throw', bufferCommands: false });

contactMessageSchema.index({ createdAt: -1 });
contactMessageSchema.index({ notificationStatus: 1, createdAt: -1 });
contactMessageSchema.index({ notificationStatus: 1, nextNotificationAt: 1 });
contactMessageSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
);

export const PortfolioModel = mongoose.model<PortfolioRecord>('Portfolio', portfolioDocumentSchema);
export const ContactMessageModel = mongoose.model<ContactRecord>('ContactMessage', contactMessageSchema);
