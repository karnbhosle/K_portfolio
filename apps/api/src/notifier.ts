import nodemailer from 'nodemailer';
import type { AppConfig } from './config.js';
import type { ContactNotifier, StoredContact } from './contracts.js';

type MailSender = { sendMail: (message: object) => Promise<{ accepted?: unknown[] }> };

export function buildNotification(contact: StoredContact, config: AppConfig['smtp']) {
  return {
    from: config.from,
    to: config.to,
    replyTo: contact.email,
    subject: 'New enquiry from KARNA / CORE',
    text: [
      'A visitor submitted a portfolio enquiry.',
      '',
      `Name: ${contact.name}`,
      `Email: ${contact.email}`,
      `Subject: ${contact.subject}`,
      '',
      contact.message,
    ].join('\n'),
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}

export function createNotifier(config: AppConfig['smtp'], sender?: MailSender): ContactNotifier {
  const configured = Boolean(config.host && config.from && config.to);
  const transport = configured ? sender ?? nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    ...(config.user && config.pass ? { auth: { user: config.user, pass: config.pass } } : {}),
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 7000,
  }) : null;

  return {
    configured,
    async send(contact) {
      if (!transport) throw new Error('SMTP is not configured.');
      const result = await transport.sendMail(buildNotification(contact, config));
      if (!result.accepted?.length) throw new Error('SMTP did not accept the recipient.');
    },
  };
}
