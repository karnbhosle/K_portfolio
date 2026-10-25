import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { portfolioSeed } from '@karna/shared';
import { ContactMessageModel, PortfolioModel } from '../src/models.js';
import { mongooseRepository } from '../src/repository.js';
import { DuplicateReceiptError } from '../src/contracts.js';

let mongo: MongoMemoryServer;

const contact = { name: 'Isolated Test', email: 'isolated@example.test', subject: 'Test only', message: 'This record exists only in the ephemeral test database.' };
const receipt = { idempotencyKey: 'integration-key-0123456789', fingerprint: 'a'.repeat(64) };
const now = new Date('2026-10-25T10:00:00.000Z');
const minutes = (count: number) => new Date(now.getTime() + count * 60_000);
const claim = { now, maxAttempts: 5, stalePendingBefore: minutes(-15) };

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
  it('creates a contact record with timestamps and counts notification attempts', async () => {
    const id = await mongooseRepository.createContact(contact, 'pending');
    const stored = await ContactMessageModel.findById(id).lean();
    expect(stored).toMatchObject({ ...contact, notificationStatus: 'pending', notificationAttempts: 0, nextNotificationAt: null });
    expect(stored).toHaveProperty('createdAt');
    expect(stored).not.toHaveProperty('website');
    expect(stored).not.toHaveProperty('idempotencyKey');
    await mongooseRepository.recordNotificationAttempt(id, 'failed', minutes(5));
    expect(await ContactMessageModel.findById(id).lean()).toMatchObject({ notificationStatus: 'failed', notificationAttempts: 1, nextNotificationAt: minutes(5) });
    await mongooseRepository.recordNotificationAttempt(id, 'accepted', null);
    expect(await ContactMessageModel.findById(id).lean()).toMatchObject({ notificationStatus: 'accepted', notificationAttempts: 2, nextNotificationAt: null });
  });

  it('stores one message per idempotency key and finds its receipt', async () => {
    const id = await mongooseRepository.createContact(contact, 'pending', receipt);
    await expect(mongooseRepository.createContact(contact, 'pending', receipt)).rejects.toBeInstanceOf(DuplicateReceiptError);
    expect(await ContactMessageModel.countDocuments()).toBe(1);
    expect(await mongooseRepository.findContactByIdempotencyKey(receipt.idempotencyKey)).toEqual({
      id, notificationStatus: 'pending', fingerprint: receipt.fingerprint,
    });
    expect(await mongooseRepository.findContactByIdempotencyKey('missing-key-0123456789')).toBeNull();
    // Messages without a key never collide with each other.
    await mongooseRepository.createContact(contact, 'pending');
    await mongooseRepository.createContact(contact, 'pending');
    expect(await ContactMessageModel.countDocuments()).toBe(3);
  });

  it('claims only notifications that are due, oldest first', async () => {
    const insert = (fields: Record<string, unknown>, createdAt: Date) => ContactMessageModel.collection.insertOne({
      ...contact, notificationUpdatedAt: minutes(-1), notificationAttempts: 1, nextNotificationAt: null, createdAt, updatedAt: createdAt, ...fields,
    });
    await insert({ notificationStatus: 'failed', nextNotificationAt: minutes(10) }, minutes(-60));
    await insert({ notificationStatus: 'failed', nextNotificationAt: minutes(-1), notificationAttempts: 5 }, minutes(-59));
    await insert({ notificationStatus: 'pending' }, minutes(-58));
    await insert({ notificationStatus: 'accepted' }, minutes(-57));
    await insert({ notificationStatus: 'not_configured' }, minutes(-56));
    const due = await insert({ notificationStatus: 'failed', nextNotificationAt: minutes(-1), notificationAttempts: 2 }, minutes(-50));
    const stale = await insert({ notificationStatus: 'pending', notificationUpdatedAt: minutes(-30) }, minutes(-40));
    const legacy = await ContactMessageModel.collection.insertOne({
      ...contact, notificationStatus: 'failed', notificationUpdatedAt: minutes(-90), createdAt: minutes(-30), updatedAt: minutes(-30),
    });

    const first = await mongooseRepository.claimNotificationRetry(claim);
    expect(first).toEqual({ id: due.insertedId.toString(), contact, attempts: 2 });
    expect(await ContactMessageModel.findById(due.insertedId).lean()).toMatchObject({ notificationStatus: 'pending', notificationUpdatedAt: now });
    expect((await mongooseRepository.claimNotificationRetry(claim))?.id).toBe(stale.insertedId.toString());
    expect(await mongooseRepository.claimNotificationRetry(claim)).toMatchObject({ id: legacy.insertedId.toString(), attempts: 0 });
    expect(await mongooseRepository.claimNotificationRetry(claim)).toBeNull();
  });

  it('lets only one of several concurrent workers claim a message', async () => {
    const id = await mongooseRepository.createContact(contact, 'pending');
    await mongooseRepository.recordNotificationAttempt(id, 'failed', minutes(-1));
    const claims = await Promise.all(Array.from({ length: 5 }, () => mongooseRepository.claimNotificationRetry(claim)));
    expect(claims.filter(Boolean)).toHaveLength(1);
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

  it('creates status, schedule and receipt indexes without indexing visitor identity', async () => {
    const indexes = await ContactMessageModel.collection.indexes();
    expect(indexes.some((index) => index.key.createdAt === -1)).toBe(true);
    expect(indexes.some((index) => index.key.notificationStatus === 1 && index.key.nextNotificationAt === 1)).toBe(true);
    const receiptIndex = indexes.find((index) => index.key.idempotencyKey === 1);
    expect(receiptIndex).toMatchObject({ unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });
    expect(indexes.some((index) => 'email' in index.key || 'name' in index.key)).toBe(false);
  });
});
