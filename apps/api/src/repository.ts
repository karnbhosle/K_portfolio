import mongoose from 'mongoose';
import { ContactMessageModel, PortfolioModel } from './models.js';
import type { ContactRepository } from './contracts.js';

export const mongooseRepository: ContactRepository = {
  isReady: () => mongoose.connection.readyState === 1,
  async getPortfolio() {
    const document = await PortfolioModel.findOne({ key: 'main' }).select('content').lean().maxTimeMS(2000);
    return document?.content ?? null;
  },
  async createContact(contact, status) {
    const document = await ContactMessageModel.create({
      name: contact.name,
      email: contact.email,
      subject: contact.subject,
      message: contact.message,
      notificationStatus: status,
      notificationUpdatedAt: new Date(),
    });
    return document._id.toString();
  },
  async updateNotification(id, status) {
    const result = await ContactMessageModel.updateOne(
      { _id: id },
      { $set: { notificationStatus: status, notificationUpdatedAt: new Date() } },
      { runValidators: true, maxTimeMS: 2000 },
    );
    if (result.matchedCount !== 1) throw new Error('Contact notification record not found.');
  },
};
