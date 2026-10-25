import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextAttemptAt, runNotificationRetries, startNotificationRetryWorker, STALE_PENDING_MS } from '../src/notification-retry.js';
import type { ContactNotifier, ContactRepository, NotificationJob } from '../src/contracts.js';

const contact = { name: 'Test Visitor', email: 'visitor@example.test', subject: 'Retry test', message: 'A message whose notification failed once.' };
const now = new Date('2026-10-25T10:00:00.000Z');

function job(attempts: number, id = `job-${attempts}`): NotificationJob {
  return { id, contact, attempts };
}

function fixture(jobs: NotificationJob[]) {
  const queue = [...jobs];
  const repository: ContactRepository = {
    isReady: vi.fn(() => true),
    getPortfolio: vi.fn(async () => null),
    createContact: vi.fn(async () => 'unused'),
    findContactByIdempotencyKey: vi.fn(async () => null),
    recordNotificationAttempt: vi.fn(async () => undefined),
    claimNotificationRetry: vi.fn(async () => queue.shift() ?? null),
  };
  const notifier: ContactNotifier = { configured: true, send: vi.fn(async () => undefined) };
  return { repository, notifier };
}

afterEach(() => { vi.useRealTimers(); });

describe('retry schedule', () => {
  it('backs off 5, 15 and 45 minutes, then stops at the attempt budget', () => {
    const minutes = (date: Date | null) => date && (date.getTime() - now.getTime()) / 60_000;
    expect(minutes(nextAttemptAt(1, 5, now))).toBe(5);
    expect(minutes(nextAttemptAt(2, 5, now))).toBe(15);
    expect(minutes(nextAttemptAt(3, 5, now))).toBe(45);
    expect(nextAttemptAt(5, 5, now)).toBeNull();
  });
});

describe('notification retry run', () => {
  it('re-sends due messages and records each outcome', async () => {
    const { repository, notifier } = fixture([job(1, 'a'), job(2, 'b')]);
    vi.mocked(notifier.send).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('SMTP down'));
    const run = await runNotificationRetries({ repository, notifier, maxAttempts: 5, now: () => now });
    expect(run).toEqual({ processed: 2, accepted: 1, failed: 1 });
    expect(repository.recordNotificationAttempt).toHaveBeenCalledWith('a', 'accepted', null);
    expect(repository.recordNotificationAttempt).toHaveBeenCalledWith('b', 'failed', new Date(now.getTime() + 45 * 60_000));
  });

  it('claims with the attempt budget and a stale-pending cutoff', async () => {
    const { repository, notifier } = fixture([]);
    await runNotificationRetries({ repository, notifier, maxAttempts: 4, now: () => now });
    expect(repository.claimNotificationRetry).toHaveBeenCalledWith({
      now,
      maxAttempts: 4,
      stalePendingBefore: new Date(now.getTime() - STALE_PENDING_MS),
    });
  });

  it('marks the last allowed failure as final', async () => {
    const { repository, notifier } = fixture([job(4)]);
    vi.mocked(notifier.send).mockRejectedValue(new Error('SMTP down'));
    const logger = vi.fn();
    await runNotificationRetries({ repository, notifier, maxAttempts: 5, now: () => now, logger });
    expect(repository.recordNotificationAttempt).toHaveBeenCalledWith('job-4', 'failed', null);
    expect(logger).toHaveBeenCalledWith('notification_retry_failed', { attempt: 5, final: true });
  });

  it('stops at the batch size', async () => {
    const { repository, notifier } = fixture([job(1, 'a'), job(1, 'b'), job(1, 'c')]);
    const run = await runNotificationRetries({ repository, notifier, maxAttempts: 5, batchSize: 2, now: () => now });
    expect(run.processed).toBe(2);
  });

  it('does nothing while email is unconfigured or the database is down', async () => {
    const { repository, notifier } = fixture([job(1)]);
    await runNotificationRetries({ repository, notifier: { ...notifier, configured: false }, maxAttempts: 5 });
    vi.mocked(repository.isReady).mockReturnValue(false);
    await runNotificationRetries({ repository, notifier, maxAttempts: 5 });
    expect(repository.claimNotificationRetry).not.toHaveBeenCalled();
  });

  it('survives a failed status write and logs it', async () => {
    const { repository, notifier } = fixture([job(1)]);
    vi.mocked(notifier.send).mockRejectedValue(new Error('SMTP down'));
    vi.mocked(repository.recordNotificationAttempt).mockRejectedValue(new Error('database interrupted'));
    const logger = vi.fn();
    await expect(runNotificationRetries({ repository, notifier, maxAttempts: 5, logger })).resolves.toMatchObject({ failed: 1 });
    expect(logger).toHaveBeenCalledWith('notification_retry_status_write_failed');
  });
});

describe('notification retry worker', () => {
  it('runs on its interval and stops cleanly', async () => {
    vi.useFakeTimers();
    const { repository, notifier } = fixture([job(1)]);
    const worker = startNotificationRetryWorker({ repository, notifier, maxAttempts: 5, intervalMs: 60_000 });
    expect(repository.claimNotificationRetry).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(notifier.send).toHaveBeenCalledTimes(1);
    await worker.stop();
    await vi.advanceTimersByTimeAsync(600_000);
    expect(notifier.send).toHaveBeenCalledTimes(1);
  });

  it('never runs when disabled', async () => {
    vi.useFakeTimers();
    const { repository, notifier } = fixture([job(1)]);
    const worker = startNotificationRetryWorker({ repository, notifier, maxAttempts: 5, intervalMs: 0 });
    await vi.advanceTimersByTimeAsync(3_600_000);
    expect(repository.claimNotificationRetry).not.toHaveBeenCalled();
    await worker.stop();
  });
});
