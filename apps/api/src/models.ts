import mongoose, { Schema } from 'mongoose';
import { portfolioSchema, type Portfolio } from '@karna/shared';
import type { NotificationStatus, StoredContact } from './contracts.js';

interface PortfolioRecord {
  key: string;
  content: Portfolio;
}

interface ContactRecord extends StoredContact {
  notificationStatus: NotificationStatus;
  notificationUpdatedAt: Date;
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
  notificationStatus: {
    type: String, required: true, enum: ['pending', 'accepted', 'failed', 'not_configured'],
  },
  notificationUpdatedAt: { type: Date, required: true, default: Date.now },
}, { timestamps: true, strict: 'throw', bufferCommands: false });

contactMessageSchema.index({ createdAt: -1 });
contactMessageSchema.index({ notificationStatus: 1, createdAt: -1 });

export const PortfolioModel = mongoose.model<PortfolioRecord>('Portfolio', portfolioDocumentSchema);
export const ContactMessageModel = mongoose.model<ContactRecord>('ContactMessage', contactMessageSchema);
