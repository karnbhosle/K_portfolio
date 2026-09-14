import { describe, expect, it, vi } from 'vitest';
import { buildNotification, createNotifier } from '../src/notifier.js';
import { readConfig } from '../src/config.js';

const smtp = { host: 'smtp.example.test', port: 587, secure: false, user: '', pass: '', from: 'portfolio@example.test', to: 'karna@example.test' };
const contact = { name: 'Test Visitor', email: 'visitor@example.test', subject: 'Subject\r\nBcc: attempt@example.test', message: '<script>test</script> A useful enquiry.' };

describe('SMTP notification', () => {
  it('uses fixed sender, recipient and subject, validated visitor Reply-To, and plain text only', () => {
    const mail = buildNotification(contact, smtp);
    expect(mail).toMatchObject({ from: smtp.from, to: smtp.to, replyTo: contact.email, subject: 'New enquiry from KARNA / CORE' });
    expect(mail).not.toHaveProperty('html');
    expect(mail).not.toHaveProperty('bcc');
    expect(mail.text).toContain(contact.message);
    expect(mail.disableFileAccess).toBe(true);
    expect(mail.disableUrlAccess).toBe(true);
  });

  it('requires SMTP recipient acceptance and never interprets it as inbox delivery', async () => {
    const sendMail = vi.fn(async () => ({ accepted: [smtp.to] }));
    const notifier = createNotifier(smtp, { sendMail });
    await expect(notifier.send(contact)).resolves.toBeUndefined();
    expect(sendMail).toHaveBeenCalledWith(buildNotification(contact, smtp));
  });

  it('rejects when the SMTP server accepts no recipient', async () => {
    const notifier = createNotifier(smtp, { sendMail: vi.fn(async () => ({ accepted: [] })) });
    await expect(notifier.send(contact)).rejects.toThrow('did not accept');
  });

  it('does not create a pretend notifier without SMTP configuration', async () => {
    const notifier = createNotifier({ ...smtp, host: '' });
    expect(notifier.configured).toBe(false);
    await expect(notifier.send(contact)).rejects.toThrow('not configured');
  });
});

describe('server configuration', () => {
  it('uses an explicit local origin and no proxy trust by default', () => {
    expect(readConfig({})).toMatchObject({ allowedOrigins: ['http://localhost:3000'], trustProxy: 0 });
  });

  it.each(['*', 'https://example.test/path', 'not a URL'])('rejects unsafe origin configuration %s', (origin) => {
    expect(() => readConfig({ ALLOWED_ORIGINS: origin })).toThrow('explicit HTTP origins');
  });

  it('rejects unbounded proxy trust and invalid ports', () => {
    expect(() => readConfig({ TRUST_PROXY: 'true' })).toThrow();
    expect(() => readConfig({ PORT: 'not-a-port' })).toThrow();
  });
});
