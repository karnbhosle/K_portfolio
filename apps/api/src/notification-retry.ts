import type { ContactNotifier, ContactRepository, SafeLogger } from './contracts.js';

export const RETRY_BASE_DELAY_MS = 5 * 60_000;
/** A `pending` status older than this means the original attempt was interrupted. */
export const STALE_PENDING_MS = 15 * 60_000;

/**
 * When the next SMTP attempt is due after `attempts` failures: 5 minutes, then 15, 45, 135…
 * Returns null once the attempt budget is spent, which leaves the message `failed` for good.
 */
export function nextAttemptAt(attempts: number, maxAttempts: number, from: Date): Date | null {
  if (attempts >= maxAttempts) return null;
  return new Date(from.getTime() + RETRY_BASE_DELAY_MS * 3 ** Math.max(0, attempts - 1));
}

export interface RetryOptions {
  repository: ContactRepository;
  notifier: ContactNotifier;
  maxAttempts: number;
  batchSize?: number;
  now?: () => Date;
  logger?: SafeLogger;
}

export interface RetryRun {
  processed: number;
  accepted: number;
  failed: number;
}

/** Re-sends due notifications one claim at a time, so concurrent workers never share a message. */
export async function runNotificationRetries(options: RetryOptions): Promise<RetryRun> {
  const { repository, notifier, maxAttempts } = options;
  const now = options.now ?? (() => new Date());
  const log = options.logger ?? (() => undefined);
  const run: RetryRun = { processed: 0, accepted: 0, failed: 0 };
  if (!notifier.configured || !repository.isReady()) return run;

  for (let index = 0; index < (options.batchSize ?? 5); index += 1) {
    const started = now();
    const job = await repository.claimNotificationRetry({
      now: started,
      maxAttempts,
      stalePendingBefore: new Date(started.getTime() - STALE_PENDING_MS),
    });
    if (!job) break;
    run.processed += 1;
    const attempt = job.attempts + 1;
    try {
      await notifier.send(job.contact);
      await repository.recordNotificationAttempt(job.id, 'accepted', null);
      run.accepted += 1;
      log('notification_retry_accepted', { attempt });
    } catch {
      run.failed += 1;
      log('notification_retry_failed', { attempt, final: attempt >= maxAttempts });
      try {
        await repository.recordNotificationAttempt(job.id, 'failed', nextAttemptAt(attempt, maxAttempts, now()));
      } catch {
        // The claim stays `pending` and becomes eligible again once it is stale.
        log('notification_retry_status_write_failed');
      }
    }
  }
  return run;
}

export interface NotificationRetryWorker {
  stop(): Promise<void>;
}

/** Runs retries on a fixed interval without overlapping runs. An interval of 0 disables the worker. */
export function startNotificationRetryWorker(options: RetryOptions & { intervalMs: number }): NotificationRetryWorker {
  const log = options.logger ?? (() => undefined);
  let timer: NodeJS.Timeout | undefined;
  let running: Promise<unknown> = Promise.resolve();
  let stopped = options.intervalMs <= 0;

  const schedule = () => {
    if (stopped) return;
    timer = setTimeout(() => {
      running = runNotificationRetries(options)
        .catch(() => log('notification_retry_run_failed'))
        .finally(schedule);
    }, options.intervalMs);
    timer.unref();
  };
  schedule();

  return {
    async stop() {
      stopped = true;
      clearTimeout(timer);
      await running;
    },
  };
}
