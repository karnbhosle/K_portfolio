import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { portfolioSeed } from '@karna/shared';
import { ContactMessageModel, PortfolioModel } from '../src/models.js';
import { mongooseRepository } from '../src/repository.js';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({
    binary: {
      downloadDir: fileURLToPath(new URL('../../../node_modules/.cache/mongodb-memory-server/', import.meta.url)),
    },
  });
  await mongoose.connect(mongo.getUri(), { dbName: 'karna_api_isolated_test' });
  await Promise.all([PortfolioModel.init(), ContactMessageModel.init()]);
});

beforeEach(async () => {
  await Promise.all([PortfolioModel.deleteMany({}), ContactMessageModel.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

describe('real Mongoose persistence in isolated ephemeral MongoDB', () => {
  it('creates a contact record with timestamps and updates its notification status', async () => {
    const contact = { name: 'Isolated Test', email: 'isolated@example.test', subject: 'Test only', message: 'This record exists only in the ephemeral test database.' };
    const id = await mongooseRepository.createContact(contact, 'pending');
    const stored = await ContactMessageModel.findById(id).lean();
    expect(stored).toMatchObject({ ...contact, notificationStatus: 'pending' });
    expect(stored).toHaveProperty('createdAt');
    expect(stored).not.toHaveProperty('website');
    await mongooseRepository.updateNotification(id, 'accepted');
    expect((await ContactMessageModel.findById(id).lean())?.notificationStatus).toBe('accepted');
  });

  it('seeds the same singleton idempotently and reads only the content', async () => {
    for (let index = 0; index < 2; index += 1) {
      await PortfolioModel.updateOne({ key: 'main' }, { $set: { content: portfolioSeed } }, { upsert: true, runValidators: true });
    }
    expect(await PortfolioModel.countDocuments()).toBe(1);
    expect(await mongooseRepository.getPortfolio()).toEqual(portfolioSeed);
  });

  it('rejects public content with fields outside the public schema', async () => {
    await expect(PortfolioModel.create({ key: 'main', content: { ...portfolioSeed, grades: 'private' } })).rejects.toThrow('public content schema');
  });

  it('creates status and chronology indexes without indexing visitor identity', async () => {
    const indexes = await ContactMessageModel.collection.indexes();
    expect(indexes.some((index) => index.key.createdAt === -1)).toBe(true);
    expect(indexes.some((index) => index.key.notificationStatus === 1)).toBe(true);
    expect(indexes.some((index) => 'email' in index.key)).toBe(false);
  });
});
