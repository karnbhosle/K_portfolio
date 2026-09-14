import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { contactSchema, portfolioSchema, portfolioSeed } from '@karna/shared';
import type { ContactNotifier, ContactRepository, NotificationStatus, SafeLogger } from './contracts.js';

export interface AppOptions {
  repository: ContactRepository;
  notifier: ContactNotifier;
  allowedOrigins: string[];
  trustProxy?: number;
  rateLimitMax?: number;
  rateLimitWindowMs?: number;
  logger?: SafeLogger;
}

const notificationCopy: Record<NotificationStatus, string> = {
  accepted: 'Your message was received and saved. An email notification was accepted by the mail service; inbox delivery is not confirmed.',
  failed: 'Your message was received and saved, but the email notification failed. Please email Karna directly for urgent enquiries.',
  not_configured: 'Your message was received and saved. Email notifications are not configured; please email Karna directly for urgent enquiries.',
  pending: 'Your message was received and saved. The email notification status could not be confirmed; please email Karna directly for urgent enquiries.',
};

export function createApp(options: AppOptions) {
  const { repository, notifier } = options;
  const log = options.logger ?? (() => undefined);
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', options.trustProxy ?? 0);
  app.use(helmet());
  app.use((req, res, next) => {
    const origin = req.get('origin');
    if (origin && !options.allowedOrigins.includes(origin)) {
      res.status(403).json({ received: false, message: 'This origin is not allowed.' });
      return;
    }
    next();
  });
  app.use(cors({ origin: options.allowedOrigins, methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type'] }));
  app.use(express.json({ limit: '32kb', strict: true }));

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
        } else if (stored !== null) log('portfolio_content_invalid');
      } catch { log('portfolio_read_failed'); }
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
    message: { received: false, message: 'Too many enquiries. Please try again later or email Karna directly.' },
  });

  app.post('/api/contact', contactLimiter, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!req.is('application/json')) {
      res.status(415).json({ received: false, message: 'Send this request as application/json.' });
      return;
    }
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        received: false,
        message: 'Please check the form fields and try again.',
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    if (parsed.data.website) {
      res.status(400).json({ received: false, message: 'Unable to accept this submission. Please email Karna directly.' });
      return;
    }
    if (!repository.isReady()) {
      res.status(503).json({ received: false, message: 'Your message could not be saved. Please try again later or email Karna directly.' });
      return;
    }
    const { name, email, subject, message } = parsed.data;
    const contact = { name, email, subject, message };
    let status: NotificationStatus = notifier.configured ? 'pending' : 'not_configured';
    let id: string;
    try {
      id = await repository.createContact(contact, status);
    } catch {
      log('contact_persistence_failed');
      res.status(503).json({ received: false, message: 'Your message could not be saved. Please try again later or email Karna directly.' });
      return;
    }
    if (notifier.configured) {
      let outcome: NotificationStatus;
      try {
        await notifier.send(contact);
        outcome = 'accepted';
      } catch {
        log('contact_notification_failed');
        outcome = 'failed';
      }
      try {
        await repository.updateNotification(id, outcome);
        status = outcome;
      } catch { log('contact_notification_status_write_failed'); }
    }
    res.status(201).json({ received: true, notification: status, message: notificationCopy[status] });
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
    log('request_failed');
    res.status(500).json({ received: false, message: 'Unable to process this request. Please try again later.' });
  };
  app.use(errorHandler);
  return app;
}
