import mongoose from 'mongoose';
import { createApp } from './app.js';
import { readConfig, smtpIncomplete } from './config.js';
import { mongooseRepository } from './repository.js';
import { createNotifier } from './notifier.js';
import { startNotificationRetryWorker } from './notification-retry.js';
import type { LogDetails } from './contracts.js';

type Level = 'info' | 'warn' | 'error';

/** One JSON object per line, so a log collector can parse events without regexes. */
function log(level: Level, event: string, details: LogDetails = {}) {
  const line = JSON.stringify({ time: new Date().toISOString(), level, service: 'karna-core-api', event, ...details });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
}

const config = readConfig();
const notifier = createNotifier(config.smtp);
const retriesEnabled = notifier.configured && config.notifications.retryIntervalMs > 0;
const app = createApp({
  repository: mongooseRepository,
  notifier,
  allowedOrigins: config.allowedOrigins,
  trustProxy: config.trustProxy,
  maxNotificationAttempts: config.notifications.maxAttempts,
  notificationRetries: retriesEnabled,
  logger: (event, details) => log('warn', event, details),
});

let connecting = false;
let closing = false;
async function connectDatabase() {
  if (!config.mongodbUri || connecting || closing || mongoose.connection.readyState === 1) return;
  connecting = true;
  try {
    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 2500,
      connectTimeoutMS: 2500,
      socketTimeoutMS: 5000,
      maxPoolSize: 10,
    });
    log('info', 'database_connected');
  } catch { log('warn', 'database_unavailable'); }
  finally { connecting = false; }
}

const server = app.listen(config.port, config.host, () => {
  log('info', 'listening', { port: config.port });
  if (!config.mongodbUri) log('warn', 'database_not_configured');
  if (smtpIncomplete(config.smtp)) log('warn', 'smtp_incomplete');
  if (!notifier.configured) log('info', 'email_notifications_disabled');
});
server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5000;
void connectDatabase();
const reconnectTimer = setInterval(() => { void connectDatabase(); }, 15_000);
reconnectTimer.unref();

const retryWorker = startNotificationRetryWorker({
  repository: mongooseRepository,
  notifier,
  maxAttempts: config.notifications.maxAttempts,
  intervalMs: retriesEnabled ? config.notifications.retryIntervalMs : 0,
  logger: (event, details) => log('warn', event, details),
});

async function shutdown(signal: string) {
  if (closing) return;
  closing = true;
  log('info', 'shutting_down', { signal });
  clearInterval(reconnectTimer);
  const forceExit = setTimeout(() => process.exit(1), 12_000);
  forceExit.unref();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await retryWorker.stop();
  await mongoose.disconnect();
  clearTimeout(forceExit);
  process.exit(0);
}

process.on('SIGINT', () => { void shutdown('SIGINT'); });
process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
