import mongoose from 'mongoose';
import { ContactMessageModel, PortfolioModel } from './models.js';
import { DuplicateReceiptError, type ContactRepository } from './contracts.js';

function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 11000;
}

export const mongooseRepository: ContactRepository = {
  isReady: () => mongoose.connection.readyState === 1,
  async getPortfolio() {
    const document = await PortfolioModel.findOne({ key: 'main' }).select('content').lean().maxTimeMS(2000);
    return document?.content ?? null;
  },
  async createContact(contact, status, receipt) {
    try {
      const document = await ContactMessageModel.create({
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
        message: contact.message,
        notificationStatus: status,
        notificationUpdatedAt: new Date(),
        notificationAttempts: 0,
        nextNotificationAt: null,
        ...(receipt ? { idempotencyKey: receipt.idempotencyKey, payloadHash: receipt.fingerprint } : {}),
      });
      return document._id.toString();
    } catch (error) {
      if (receipt && isDuplicateKey(error)) throw new DuplicateReceiptError();
      throw error;
    }
  },
  async findContactByIdempotencyKey(key) {
    const document = await ContactMessageModel.findOne({ idempotencyKey: key })
      .select('notificationStatus payloadHash').lean().maxTimeMS(2000);
    if (!document) return null;
    return {
      id: document._id.toString(),
      notificationStatus: document.notificationStatus,
      fingerprint: document.payloadHash ?? null,
    };
  },
  async recordNotificationAttempt(id, status, nextAttemptAt) {
    const result = await ContactMessageModel.updateOne(
      { _id: id },
      {
        $set: { notificationStatus: status, notificationUpdatedAt: new Date(), nextNotificationAt: nextAttemptAt },
        $inc: { notificationAttempts: 1 },
      },
      { runValidators: true, maxTimeMS: 2000 },
    );
    if (result.matchedCount !== 1) throw new Error('Contact notification record not found.');
  },
  async claimNotificationRetry({ now, maxAttempts, stalePendingBefore }) {
    // The status condition in the filter makes the claim atomic: two workers cannot both win it.
    const document = await ContactMessageModel.findOneAndUpdate(
      {
        notificationAttempts: { $not: { $gte: maxAttempts } },
        $or: [
          { notificationStatus: 'failed', nextNotificationAt: { $lte: now } },
          // Failures saved before retries existed have no schedule; they are due now.
          { notificationStatus: 'failed', nextNotificationAt: { $exists: false } },
          { notificationStatus: 'pending', notificationUpdatedAt: { $lte: stalePendingBefore } },
        ],
      },
      { $set: { notificationStatus: 'pending', notificationUpdatedAt: now } },
      { sort: { createdAt: 1 }, returnDocument: 'after', runValidators: true, maxTimeMS: 2000 },
    ).select('name email subject message notificationAttempts').lean();
    if (!document) return null;
    return {
      id: document._id.toString(),
      contact: { name: document.name, email: document.email, subject: document.subject, message: document.message },
      attempts: document.notificationAttempts ?? 0,
    };
  },
};
