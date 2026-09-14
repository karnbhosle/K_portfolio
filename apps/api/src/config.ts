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
  };
}

export type AppConfig = ReturnType<typeof readConfig>;
