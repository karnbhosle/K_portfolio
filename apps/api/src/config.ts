import 'dotenv/config';

function integer(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  if (value === undefined || value === '') return fallback;
  const result = Number(value);
  if (!Number.isInteger(result) || result < minimum || result > maximum) {
    throw new Error('Invalid numeric server configuration.');
  }
  return result;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const allowedOrigins = (env.ALLOWED_ORIGINS ?? 'http://localhost:3000')
    .split(',').map((origin) => origin.trim()).filter(Boolean);
  if (!allowedOrigins.length || allowedOrigins.some((origin) => {
    try {
      const parsed = new URL(origin);
      return !['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin;
    } catch { return true; }
  })) throw new Error('ALLOWED_ORIGINS must contain explicit HTTP origins.');

  const retryIntervalMs = integer(env.NOTIFY_RETRY_INTERVAL_MS, 300_000, 0, 86_400_000);
  if (retryIntervalMs > 0 && retryIntervalMs < 10_000) {
    throw new Error('NOTIFY_RETRY_INTERVAL_MS must be 0 (disabled) or at least 10000.');
  }

  return {
    host: env.HOST ?? '127.0.0.1',
    port: integer(env.PORT, 4000, 1, 65535),
    mongodbUri: env.MONGODB_URI ?? '',
    allowedOrigins,
    trustProxy: integer(env.TRUST_PROXY, 0, 0, 10),
    smtp: {
      host: env.SMTP_HOST ?? '',
      port: integer(env.SMTP_PORT, 587, 1, 65535),
      secure: env.SMTP_SECURE === 'true',
      user: env.SMTP_USER ?? '',
      pass: env.SMTP_PASS ?? '',
      from: env.SMTP_FROM ?? '',
      to: env.SMTP_TO ?? 'karnabhosle223@gmail.com',
    },
    notifications: {
      retryIntervalMs,
      maxAttempts: integer(env.NOTIFY_MAX_ATTEMPTS, 5, 1, 20),
    },
  };
}

export type AppConfig = ReturnType<typeof readConfig>;

/** True when some SMTP settings are present but not enough to send, which usually means a typo. */
export function smtpIncomplete(smtp: AppConfig['smtp']): boolean {
  const set = [smtp.host, smtp.from, smtp.to].filter(Boolean).length;
  return (Boolean(smtp.host) || Boolean(smtp.from) || Boolean(smtp.user)) && set < 3;
}
