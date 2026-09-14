import mongoose from 'mongoose';
import { createApp } from './app.js';
import { readConfig } from './config.js';
import { mongooseRepository } from './repository.js';
import { createNotifier } from './notifier.js';

const config = readConfig();
const app = createApp({
  repository: mongooseRepository,
  notifier: createNotifier(config.smtp),
  allowedOrigins: config.allowedOrigins,
  trustProxy: config.trustProxy,
  logger: (event) => console.warn(`[api] ${event}`),
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
    console.info('[api] database_connected');
  } catch { console.warn('[api] database_unavailable'); }
  finally { connecting = false; }
}

const server = app.listen(config.port, config.host, () => {
  console.info(`[api] listening_on_port_${config.port}`);
  if (!config.mongodbUri) console.warn('[api] database_not_configured');
});
server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5000;
void connectDatabase();
const reconnectTimer = setInterval(() => { void connectDatabase(); }, 15_000);
reconnectTimer.unref();

async function shutdown() {
  if (closing) return;
  closing = true;
  clearInterval(reconnectTimer);
  const forceExit = setTimeout(() => process.exit(1), 12_000);
  forceExit.unref();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await mongoose.disconnect();
  clearTimeout(forceExit);
  process.exit(0);
}

process.on('SIGINT', () => { void shutdown(); });
process.on('SIGTERM', () => { void shutdown(); });
