import { createHash, randomUUID } from 'node:crypto';
import express, { type ErrorRequestHandler, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { contactSchema, idempotencyKeySchema, portfolioSchema, portfolioSeed } from '@karna/shared';
import { DuplicateReceiptError } from './contracts.js';
import type { ContactNotifier, ContactReceiptRecord, ContactRepository, NotificationStatus, SafeLogger, StoredContact } from './contracts.js';
import { nextAttemptAt } from './notification-retry.js';

export interface AppOptions {
  repository: ContactRepository;
  notifier: ContactNotifier;
  allowedOrigins: string[];
  trustProxy?: number;
  rateLimitMax?: number;
  rateLimitWindowMs?: number;
  /** SMTP attempts per message, including the first one made during the request. */
  maxNotificationAttempts?: number;
  /** True when the background worker retries failed notifications. */
  notificationRetries?: boolean;
  logger?: SafeLogger;
}

const notificationCopy: Record<NotificationStatus, string> = {
  accepted: 'Your message was received and saved. An email notification was accepted by the mail service; inbox delivery is not confirmed.',
  failed: 'Your message was received and saved, but the email notification failed. Please email Karna directly for urgent enquiries.',
  not_configured: 'Your message was received and saved. Email notifications are not configured; please email Karna directly for urgent enquiries.',
  pending: 'Your message was received and saved. The email notification status could not be confirmed; please email Karna directly for urgent enquiries.',
};
const failedWithRetries = 'Your message was received and saved, but the email notification failed and will be retried automatically. Please email Karna directly for urgent enquiries.';

const unsaved = 'Your message could not be saved. Please try again later or email Karna directly.';
const requestIdPattern = /^[A-Za-z0-9_-]{8,64}$/;

/** A stable digest of the visitor's message, used to tell a genuine retry from a reused key. */
export function fingerprintContact(contact: StoredContact): string {
  return createHash('sha256')
    .update(JSON.stringify([contact.name, contact.email, contact.subject, contact.message]))
    .digest('hex');
}

function requestId(res: Response): string {
  return String(res.locals.requestId ?? 'unknown');
}

export function createApp(options: AppOptions) {
  const { repository, notifier } = options;
  const log = options.logger ?? (() => undefined);
  const maxAttempts = options.maxNotificationAttempts ?? 5;
  const copy = options.notificationRetries ? { ...notificationCopy, failed: failedWithRetries } : notificationCopy;
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', options.trustProxy ?? 0);
  app.use(helmet());

  // Correlates a response with its log lines. A well-formed caller ID is kept so traces can span services.
  app.use((req, res, next) => {
    const incoming = req.get('x-request-id');
    const id = incoming && requestIdPattern.test(incoming) ? incoming : randomUUID();
    res.locals.requestId = id;
    res.set('X-Request-Id', id);
    next();
  });

  app.use((req, res, next) => {
    const origin = req.get('origin');
    if (origin && !options.allowedOrigins.includes(origin)) {
      res.status(403).json({ received: false, message: 'This origin is not allowed.' });
      return;
    }
    next();
  });
  app.use(cors({
    origin: options.allowedOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Idempotency-Key', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'Retry-After', 'RateLimit', 'RateLimit-Policy'],
    maxAge: 600,
  }));
  app.use(express.json({ limit: '32kb', strict: true }));

  app.get('/api/health/live', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ service: 'karna-core-api', status: 'ok' });
  });

  app.get('/api/health', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    const ready = repository.isReady();
    res.status(ready ? 200 : 503).json({
      service: 'karna-core-api', status: ready ? 'ok' : 'degraded',
      database: ready ? 'connected' : 'unavailable',
      email: notifier.configured ? 'configured' : 'not_configured',
    });
  });

  app.get('/api/portfolio', async (_req, res) => {
    let content = portfolioSeed;
    let source = 'seed';
    if (repository.isReady()) {
      try {
        const stored = await repository.getPortfolio();
        const validated = portfolioSchema.safeParse(stored);
        if (validated.success) {
          content = validated.data;
          source = 'database';
        } else if (stored !== null) log('portfolio_content_invalid', { requestId: requestId(res) });
      } catch { log('portfolio_read_failed', { requestId: requestId(res) }); }
    }
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    res.set('X-Portfolio-Source', source);
    res.json(content);
  });

  const contactLimiter = rateLimit({
    windowMs: options.rateLimitWindowMs ?? 15 * 60 * 1000,
    limit: options.rateLimitMax ?? 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { received: false, message: 'Too many enquiries from this network. Please try again later or email Karna directly.' },
  });

  const replay = (res: Response, record: ContactReceiptRecord, fingerprint: string) => {
    if (record.fingerprint !== fingerprint) {
      res.status(409).json({ received: false, message: 'This request key was already used for a different message. Reload the page and send it again.' });
      return;
    }
    res.status(200).json({
      received: true,
      notification: record.notificationStatus,
      message: copy[record.notificationStatus],
      replayed: true,
    });
  };

  app.post('/api/contact', contactLimiter, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!req.is('application/json')) {
      res.status(415).json({ received: false, message: 'Send this request as application/json.' });
      return;
    }
    const keyHeader = req.get('idempotency-key');
    const key = keyHeader === undefined ? undefined : idempotencyKeySchema.safeParse(keyHeader);
    if (key && !key.success) {
      res.status(400).json({ received: false, message: 'The Idempotency-Key header must be 16–128 letters, digits, hyphens or underscores.' });
      return;
    }
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        received: false,
        message: 'Please check the highlighted fields and try again.',
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    if (parsed.data.website) {
      res.status(400).json({ received: false, message: 'Unable to accept this submission. Please email Karna directly.' });
      return;
    }
    if (!repository.isReady()) {
      res.status(503).json({ received: false, message: unsaved });
      return;
    }

    const { name, email, subject, message } = parsed.data;
    const contact = { name, email, subject, message };
    const receipt = key ? { idempotencyKey: key.data, fingerprint: fingerprintContact(contact) } : undefined;

    if (receipt) {
      try {
        const existing = await repository.findContactByIdempotencyKey(receipt.idempotencyKey);
        if (existing) {
          replay(res, existing, receipt.fingerprint);
          return;
        }
      } catch {
        log('contact_receipt_lookup_failed', { requestId: requestId(res) });
        res.status(503).json({ received: false, message: unsaved });
        return;
      }
    }

    let status: NotificationStatus = notifier.configured ? 'pending' : 'not_configured';
    let id: string;
    try {
      id = await repository.createContact(contact, status, receipt);
    } catch (error) {
      if (error instanceof DuplicateReceiptError && receipt) {
        // A concurrent retry with the same key won the insert; answer with its receipt.
        const existing = await repository.findContactByIdempotencyKey(receipt.idempotencyKey).catch(() => null);
        if (existing) {
          replay(res, existing, receipt.fingerprint);
          return;
        }
      }
      log('contact_persistence_failed', { requestId: requestId(res) });
      res.status(503).json({ received: false, message: unsaved });
      return;
    }

    if (notifier.configured) {
      let outcome: NotificationStatus;
      try {
        await notifier.send(contact);
        outcome = 'accepted';
      } catch {
        log('contact_notification_failed', { requestId: requestId(res) });
        outcome = 'failed';
      }
      try {
        const retryAt = outcome === 'failed' && options.notificationRetries ? nextAttemptAt(1, maxAttempts, new Date()) : null;
        await repository.recordNotificationAttempt(id, outcome, retryAt);
        status = outcome;
      } catch { log('contact_notification_status_write_failed', { requestId: requestId(res) }); }
    }
    res.status(201).json({ received: true, notification: status, message: copy[status] });
  });

  app.use((_req, res) => res.status(404).json({ message: 'Endpoint not found.' }));
  const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    const known = typeof error === 'object' && error !== null ? error as { type?: string } : {};
    if (known.type === 'entity.too.large') {
      res.status(413).json({ received: false, message: 'The request is too large.' });
      return;
    }
    if (known.type === 'entity.parse.failed') {
      res.status(400).json({ received: false, message: 'The request contains malformed JSON.' });
      return;
    }
    log('request_failed', { requestId: requestId(res) });
    res.status(500).json({ received: false, message: 'Unable to process this request. Please try again later.' });
  };
  app.use(errorHandler);
  return app;
}
