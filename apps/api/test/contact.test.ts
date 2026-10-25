import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { portfolioSeed } from '@karna/shared';
import { createApp, fingerprintContact } from '../src/app.js';
import type { AppOptions } from '../src/app.js';
import { DuplicateReceiptError } from '../src/contracts.js';
import type { ContactNotifier, ContactRepository } from '../src/contracts.js';

const payload = { name: 'Test Visitor', email: 'visitor@example.test', subject: 'Portfolio enquiry', message: 'I would like to discuss a software development opportunity.' };
const key = 'retry-key-0123456789abcdef';

function fixture(overrides: Partial<AppOptions> = {}) {
  const repository: ContactRepository = {
    isReady: vi.fn(() => true),
    getPortfolio: vi.fn(async () => portfolioSeed),
    createContact: vi.fn(async () => 'test-record-id'),
    findContactByIdempotencyKey: vi.fn(async () => null),
    recordNotificationAttempt: vi.fn(async () => undefined),
    claimNotificationRetry: vi.fn(async () => null),
  };
  const notifier: ContactNotifier = { configured: true, send: vi.fn(async () => undefined) };
  const logger = vi.fn();
  const app = createApp({ repository, notifier, allowedOrigins: ['http://localhost:3000'], logger, ...overrides });
  return { app, repository, notifier, logger };
}

describe('contact validation and receipt', () => {
  it('persists first, accepts SMTP, and stores the accepted notification status', async () => {
    const { app, repository, notifier } = fixture();
    const result = await request(app).post('/api/contact').send(payload);
    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({ received: true, notification: 'accepted' });
    expect(result.body.message).toContain('inbox delivery is not confirmed');
    expect(repository.createContact).toHaveBeenCalledWith(payload, 'pending', undefined);
    expect(notifier.send).toHaveBeenCalledWith(payload);
    expect(repository.recordNotificationAttempt).toHaveBeenCalledWith('test-record-id', 'accepted', null);
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
    { ...payload, subject: 'Hello\r\nBcc: attacker@example.test' },
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
    expect(result.body.message).not.toContain('retried');
    expect(result.text).not.toContain('private SMTP');
    expect(repository.recordNotificationAttempt).toHaveBeenCalledWith('test-record-id', 'failed', null);
  });

  it('schedules a retry and says so only when background retries are enabled', async () => {
    const { app, notifier, repository } = fixture({ notificationRetries: true });
    vi.mocked(notifier.send).mockRejectedValue(new Error('SMTP timeout'));
    const before = Date.now();
    const result = await request(app).post('/api/contact').send(payload);
    expect(result.status).toBe(201);
    expect(result.body.message).toContain('retried automatically');
    const nextAttempt = vi.mocked(repository.recordNotificationAttempt).mock.calls[0]?.[2];
    expect(nextAttempt).toBeInstanceOf(Date);
    expect((nextAttempt as Date).getTime()).toBeGreaterThanOrEqual(before + 5 * 60_000);
  });

  it('stores not_configured and advises direct email when SMTP is absent', async () => {
    const notifier = { configured: false, send: vi.fn(async () => undefined) };
    const { app, repository } = fixture({ notifier });
    const result = await request(app).post('/api/contact').send(payload);
    expect(result.status).toBe(201);
    expect(result.body.notification).toBe('not_configured');
    expect(repository.createContact).toHaveBeenCalledWith(payload, 'not_configured', undefined);
    expect(notifier.send).not.toHaveBeenCalled();
    expect(repository.recordNotificationAttempt).not.toHaveBeenCalled();
  });

  it('keeps the persisted pending state when the notification status update fails', async () => {
    const { app, repository } = fixture();
    vi.mocked(repository.recordNotificationAttempt).mockRejectedValue(new Error('database interrupted'));
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
    expect(result.body.received).toBe(false);
    expect(repository.createContact).toHaveBeenCalledTimes(2);
  });

  it('rejects malformed JSON, non-JSON bodies and oversized bodies without internal error details', async () => {
    const { app, repository } = fixture();
    await request(app).post('/api/contact').type('json').send('{broken').expect(400);
    await request(app).post('/api/contact').type('form').send(payload).expect(415);
    await request(app).post('/api/contact').send({ ...payload, message: 'x'.repeat(40_000) }).expect(413);
    expect(repository.createContact).not.toHaveBeenCalled();
  });

  it('rejects an unapproved browser origin and allows the explicit web origin', async () => {
    const { app } = fixture();
    await request(app).post('/api/contact').set('Origin', 'https://unapproved.example').send(payload).expect(403);
    const result = await request(app).post('/api/contact').set('Origin', 'http://localhost:3000').send(payload);
    expect(result.status).toBe(201);
    expect(result.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(result.headers['access-control-expose-headers']).toContain('Retry-After');
    expect(result.headers['x-content-type-options']).toBe('nosniff');
  });

  it('allows the Idempotency-Key header in browser preflight requests', async () => {
    const { app } = fixture();
    const result = await request(app).options('/api/contact')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,idempotency-key');
    expect(result.status).toBe(204);
    expect(result.headers['access-control-allow-headers']).toMatch(/Idempotency-Key/i);
    expect(result.headers['access-control-max-age']).toBe('600');
  });

  it('provides no public message listing or editing endpoints', async () => {
    const { app } = fixture();
    await request(app).get('/api/contact').expect(404);
    await request(app).get('/api/messages').expect(404);
    await request(app).put('/api/portfolio').send({}).expect(404);
  });
});

describe('idempotent contact submissions', () => {
  it('saves the key and a fingerprint with the first submission', async () => {
    const { app, repository } = fixture();
    const result = await request(app).post('/api/contact').set('Idempotency-Key', key).send(payload);
    expect(result.status).toBe(201);
    expect(repository.findContactByIdempotencyKey).toHaveBeenCalledWith(key);
    expect(repository.createContact).toHaveBeenCalledWith(payload, 'pending', { idempotencyKey: key, fingerprint: fingerprintContact(payload) });
  });

  it('replays the original receipt for a retried submission without saving or emailing again', async () => {
    const { app, repository, notifier } = fixture();
    vi.mocked(repository.findContactByIdempotencyKey).mockResolvedValue({
      id: 'test-record-id', notificationStatus: 'accepted', fingerprint: fingerprintContact(payload),
    });
    const result = await request(app).post('/api/contact').set('Idempotency-Key', key).send(payload);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ received: true, notification: 'accepted', replayed: true });
    expect(repository.createContact).not.toHaveBeenCalled();
    expect(notifier.send).not.toHaveBeenCalled();
  });

  it('refuses to reuse a key for a different message', async () => {
    const { app, repository } = fixture();
    vi.mocked(repository.findContactByIdempotencyKey).mockResolvedValue({
      id: 'test-record-id', notificationStatus: 'accepted', fingerprint: fingerprintContact({ ...payload, message: 'A different enquiry entirely.' }),
    });
    const result = await request(app).post('/api/contact').set('Idempotency-Key', key).send(payload);
    expect(result.status).toBe(409);
    expect(result.body.received).toBe(false);
    expect(repository.createContact).not.toHaveBeenCalled();
  });

  it('answers a concurrent duplicate insert with the winning receipt', async () => {
    const { app, repository, notifier } = fixture();
    vi.mocked(repository.findContactByIdempotencyKey)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'winner', notificationStatus: 'pending', fingerprint: fingerprintContact(payload) });
    vi.mocked(repository.createContact).mockRejectedValue(new DuplicateReceiptError());
    const result = await request(app).post('/api/contact').set('Idempotency-Key', key).send(payload);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ received: true, notification: 'pending', replayed: true });
    expect(notifier.send).not.toHaveBeenCalled();
  });

  it.each(['short', 'has spaces in it 0123456789', 'x'.repeat(129), 'semi;colon-0123456789'])(
    'rejects the malformed key %s before persistence',
    async (malformed) => {
      const { app, repository } = fixture();
      const result = await request(app).post('/api/contact').set('Idempotency-Key', malformed).send(payload);
      expect(result.status).toBe(400);
      expect(repository.createContact).not.toHaveBeenCalled();
    },
  );

  it('fails honestly when the receipt lookup fails', async () => {
    const { app, repository } = fixture();
    vi.mocked(repository.findContactByIdempotencyKey).mockRejectedValue(new Error('secret lookup failure'));
    const result = await request(app).post('/api/contact').set('Idempotency-Key', key).send(payload);
    expect(result.status).toBe(503);
    expect(result.text).not.toContain('secret');
    expect(repository.createContact).not.toHaveBeenCalled();
  });
});

describe('request tracing and logging', () => {
  it('returns a request ID and keeps a well-formed caller ID', async () => {
    const { app } = fixture();
    const generated = await request(app).get('/api/health/live');
    expect(generated.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    const kept = await request(app).get('/api/health/live').set('X-Request-Id', 'trace_1234abcd');
    expect(kept.headers['x-request-id']).toBe('trace_1234abcd');
    const replaced = await request(app).get('/api/health/live').set('X-Request-Id', 'bad id\twith spaces');
    expect(replaced.headers['x-request-id']).not.toBe('bad id\twith spaces');
  });

  it('logs event codes with the request ID but never visitor content', async () => {
    const { app, repository, logger } = fixture();
    vi.mocked(repository.createContact).mockRejectedValue(new Error('down'));
    const result = await request(app).post('/api/contact').send(payload);
    expect(logger).toHaveBeenCalledWith('contact_persistence_failed', { requestId: result.headers['x-request-id'] });
    const logged = JSON.stringify(logger.mock.calls);
    expect(logged).not.toContain(payload.email);
    expect(logged).not.toContain(payload.message);
  });
});

describe('public content and health', () => {
  it('reports liveness without depending on the database', async () => {
    const { app, repository } = fixture();
    vi.mocked(repository.isReady).mockReturnValue(false);
    const result = await request(app).get('/api/health/live');
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ service: 'karna-core-api', status: 'ok' });
    expect(result.headers['cache-control']).toBe('no-store');
  });

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

  it('fills optional fields added after older content was stored', async () => {
    const { app, repository } = fixture();
    const legacy: Record<string, unknown> = structuredClone(portfolioSeed);
    const profile = legacy.profile as Record<string, unknown>;
    for (const field of ['github', 'availability', 'portrait', 'timeZone']) delete profile[field];
    for (const project of legacy.projects as Record<string, unknown>[]) {
      delete project.pipeline;
      delete project.features;
    }
    vi.mocked(repository.getPortfolio).mockResolvedValue(legacy);
    const result = await request(app).get('/api/portfolio');
    expect(result.headers['x-portfolio-source']).toBe('database');
    expect(result.body.profile).toMatchObject({ github: null, availability: null, portrait: null, timeZone: 'Asia/Kolkata' });
    expect(result.body.projects[0]).toMatchObject({ pipeline: [], features: [] });
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
