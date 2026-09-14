import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { portfolioSeed } from '@karna/shared';
import { createApp } from '../src/app.js';
import type { AppOptions } from '../src/app.js';
import type { ContactNotifier, ContactRepository } from '../src/contracts.js';

const payload = { name: 'Test Visitor', email: 'visitor@example.test', subject: 'Portfolio enquiry', message: 'I would like to discuss a software development opportunity.' };

function fixture(overrides: Partial<AppOptions> = {}) {
  const repository: ContactRepository = {
    isReady: vi.fn(() => true),
    getPortfolio: vi.fn(async () => portfolioSeed),
    createContact: vi.fn(async () => 'test-record-id'),
    updateNotification: vi.fn(async () => undefined),
  };
  const notifier: ContactNotifier = { configured: true, send: vi.fn(async () => undefined) };
  const app = createApp({ repository, notifier, allowedOrigins: ['http://localhost:3000'], ...overrides });
  return { app, repository, notifier };
}

describe('contact validation and receipt', () => {
  it('persists first, accepts SMTP, and stores the accepted notification status', async () => {
    const { app, repository, notifier } = fixture();
    const result = await request(app).post('/api/contact').send(payload);
    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({ received: true, notification: 'accepted' });
    expect(result.body.message).toContain('inbox delivery is not confirmed');
    expect(repository.createContact).toHaveBeenCalledWith(payload, 'pending');
    expect(notifier.send).toHaveBeenCalledWith(payload);
    expect(repository.updateNotification).toHaveBeenCalledWith('test-record-id', 'accepted');
    const savedOrder = vi.mocked(repository.createContact).mock.invocationCallOrder[0];
    const sentOrder = vi.mocked(notifier.send).mock.invocationCallOrder[0];
    expect(savedOrder).toBeLessThan(sentOrder!);
  });

  it.each([
    { ...payload, email: 'invalid' },
    { ...payload, name: 'A' },
    { ...payload, name: 'A'.repeat(101) },
    { ...payload, subject: 'ab' },
    { ...payload, subject: 'x'.repeat(151) },
    { ...payload, message: 'short' },
    { ...payload, message: 'x'.repeat(5001) },
    { ...payload, to: 'attacker@example.test' },
    { ...payload, admin: true },
    { ...payload, email: 'visitor@example.test\r\nBcc:attacker@example.test' },
  ])('rejects invalid or unexpected payload fields without persistence', async (invalid) => {
    const { app, repository, notifier } = fixture();
    const result = await request(app).post('/api/contact').send(invalid);
    expect(result.status).toBe(400);
    expect(result.body.received).toBe(false);
    expect(repository.createContact).not.toHaveBeenCalled();
    expect(notifier.send).not.toHaveBeenCalled();
  });

  it('rejects the honeypot without recording a false receipt', async () => {
    const { app, repository } = fixture();
    const result = await request(app).post('/api/contact').send({ ...payload, website: 'spam.test' });
    expect(result.status).toBe(400);
    expect(result.body.received).toBe(false);
    expect(repository.createContact).not.toHaveBeenCalled();
  });

  it('returns an honest failure and never sends email when persistence fails', async () => {
    const { app, repository, notifier } = fixture();
    vi.mocked(repository.createContact).mockRejectedValue(new Error('private database credentials'));
    const result = await request(app).post('/api/contact').send(payload);
    expect(result.status).toBe(503);
    expect(result.body.received).toBe(false);
    expect(result.body.message).toContain('could not be saved');
    expect(result.text).not.toContain('private database');
    expect(notifier.send).not.toHaveBeenCalled();
  });

  it('does not buffer contact submissions when the database is unavailable', async () => {
    const { app, repository } = fixture();
    vi.mocked(repository.isReady).mockReturnValue(false);
    const result = await request(app).post('/api/contact').send(payload);
    expect(result.status).toBe(503);
    expect(repository.createContact).not.toHaveBeenCalled();
  });

  it('preserves receipt and stores failure when SMTP fails', async () => {
    const { app, notifier, repository } = fixture();
    vi.mocked(notifier.send).mockRejectedValue(new Error('private SMTP password'));
    const result = await request(app).post('/api/contact').send(payload);
    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({ received: true, notification: 'failed' });
    expect(result.body.message).toContain('email notification failed');
    expect(result.text).not.toContain('private SMTP');
    expect(repository.updateNotification).toHaveBeenCalledWith('test-record-id', 'failed');
  });

  it('stores not_configured and advises direct email when SMTP is absent', async () => {
    const notifier = { configured: false, send: vi.fn(async () => undefined) };
    const { app, repository } = fixture({ notifier });
    const result = await request(app).post('/api/contact').send(payload);
    expect(result.status).toBe(201);
    expect(result.body.notification).toBe('not_configured');
    expect(repository.createContact).toHaveBeenCalledWith(payload, 'not_configured');
    expect(notifier.send).not.toHaveBeenCalled();
    expect(repository.updateNotification).not.toHaveBeenCalled();
  });

  it('keeps the persisted pending state when the notification status update fails', async () => {
    const { app, repository } = fixture();
    vi.mocked(repository.updateNotification).mockRejectedValue(new Error('database interrupted'));
    const result = await request(app).post('/api/contact').send(payload);
    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({ received: true, notification: 'pending' });
    expect(result.body.message).toContain('status could not be confirmed');
  });

  it('enforces the contact rate limit with a retry header', async () => {
    const { app, repository } = fixture({ rateLimitMax: 2 });
    await request(app).post('/api/contact').send(payload).expect(201);
    await request(app).post('/api/contact').send(payload).expect(201);
    const result = await request(app).post('/api/contact').send(payload);
    expect(result.status).toBe(429);
    expect(result.headers['retry-after']).toBeDefined();
    expect(repository.createContact).toHaveBeenCalledTimes(2);
  });

  it('rejects malformed JSON and oversized bodies without internal error details', async () => {
    const { app, repository } = fixture();
    await request(app).post('/api/contact').type('json').send('{broken').expect(400);
    await request(app).post('/api/contact').send({ ...payload, message: 'x'.repeat(40_000) }).expect(413);
    expect(repository.createContact).not.toHaveBeenCalled();
  });

  it('rejects an unapproved browser origin and allows the explicit web origin', async () => {
    const { app } = fixture();
    await request(app).post('/api/contact').set('Origin', 'https://unapproved.example').send(payload).expect(403);
    const result = await request(app).post('/api/contact').set('Origin', 'http://localhost:3000').send(payload);
    expect(result.status).toBe(201);
    expect(result.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(result.headers['x-content-type-options']).toBe('nosniff');
  });

  it('provides no public message listing or editing endpoints', async () => {
    const { app } = fixture();
    await request(app).get('/api/contact').expect(404);
    await request(app).get('/api/messages').expect(404);
    await request(app).put('/api/portfolio').send({}).expect(404);
  });
});

describe('public content and health', () => {
  it('returns only the canonical typed public document', async () => {
    const { app } = fixture();
    const result = await request(app).get('/api/portfolio');
    expect(result.status).toBe(200);
    expect(result.body).toEqual(portfolioSeed);
    expect(result.headers['x-portfolio-source']).toBe('database');
    expect(result.body).not.toHaveProperty('_id');
    expect(result.body).not.toHaveProperty('messages');
    expect(result.text).not.toMatch(/cgpa|"grades?"|"marks"|"percentage"/i);
  });

  it('falls back to canonical content if the database document includes private unknown fields', async () => {
    const { app, repository } = fixture();
    vi.mocked(repository.getPortfolio).mockResolvedValue({ ...portfolioSeed, internalSecret: 'never expose' });
    const result = await request(app).get('/api/portfolio');
    expect(result.status).toBe(200);
    expect(result.headers['x-portfolio-source']).toBe('seed');
    expect(result.body).toEqual(portfolioSeed);
    expect(result.text).not.toContain('never expose');
  });

  it('serves fallback content when the database is down and reports degraded health', async () => {
    const { app, repository } = fixture();
    vi.mocked(repository.isReady).mockReturnValue(false);
    const result = await request(app).get('/api/portfolio');
    expect(result.status).toBe(200);
    expect(result.body).toEqual(portfolioSeed);
    expect(repository.getPortfolio).not.toHaveBeenCalled();
    const health = await request(app).get('/api/health');
    expect(health.status).toBe(503);
    expect(health.body).toEqual({ service: 'karna-core-api', status: 'degraded', database: 'unavailable', email: 'configured' });
  });

  it('falls back when a content read fails and does not leak the exception', async () => {
    const { app, repository } = fixture();
    vi.mocked(repository.getPortfolio).mockRejectedValue(new Error('secret connection string'));
    const result = await request(app).get('/api/portfolio');
    expect(result.body).toEqual(portfolioSeed);
    expect(result.text).not.toContain('secret connection string');
  });
});
