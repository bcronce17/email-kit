import type { Mailbox, Message, EmailConfig, SmtpConfig } from './types.js';
import { EmailConfigurationError, EmailMessageError } from './errors.js';

function isValidHeader(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !/[\r\n\0]/.test(value);
}

export function parseMailbox(value: unknown): Mailbox {
  const item = typeof value === 'string' ? { address: value } : value;

  if (!item || typeof item !== 'object') {
    throw new EmailMessageError('Invalid mailbox');
  }

  const { address, name } = item as Mailbox;

  // Deliberately accept one plain mailbox, not address lists or display-name syntax.
  if (!isValidHeader(address) || !/^[^\s@<>,;"\\]+@[^\s@<>,;"\\]+\.[^\s@<>,;"\\]+$/.test(address)) {
    throw new EmailMessageError('Expected one email address');
  }

  if (name !== undefined && !isValidHeader(name)) {
    throw new EmailMessageError('Invalid display name');
  }

  return name === undefined ? { address } : { address, name };
}

export function validateMessage(input: Message): Message {
  if (!input || typeof input !== 'object') {
    throw new EmailMessageError('Invalid message');
  }

  const to = parseMailbox(input.to);

  if (!isValidHeader(input.subject)) {
    throw new EmailMessageError('Invalid subject');
  }

  if (typeof input.text !== 'string' || !input.text.trim()) {
    throw new EmailMessageError('Text body is required');
  }

  if (input.html !== undefined && typeof input.html !== 'string') {
    throw new EmailMessageError('HTML must be a string');
  }

  if (
    input.messageId !== undefined &&
    (!isValidHeader(input.messageId) || !/^<[^\s<>]+@[^\s<>]+>$/.test(input.messageId))
  ) {
    throw new EmailMessageError('Invalid message ID');
  }

  return {
    to,
    subject: input.subject,
    text: input.text,
    ...(input.html === undefined ? {} : { html: input.html }),
    ...(input.replyTo === undefined ? {} : { replyTo: parseMailbox(input.replyTo) }),
    ...(input.messageId === undefined ? {} : { messageId: input.messageId })
  };
}

export function validateConfiguration(input: EmailConfig): EmailConfig {
  // Snapshot configuration so later caller mutations cannot bypass validation.
  const config = structuredClone(input);

  if (!config || !['memory', 'capture', 'live'].includes(config.mode)) {
    failConfiguration('Explicit email mode is required');
  }

  if (!['development', 'test', 'preview', 'production'].includes(config.environment)) {
    failConfiguration('Explicit environment is required');
  }

  try {
    config.from = parseMailbox(config.from);
  } catch {
    failConfiguration('Valid sender mailbox is required');
  }

  if (config.environment === 'production' && config.mode !== 'live') {
    failConfiguration('Production requires live mode');
  }

  if (config.mode === 'memory') {
    return config;
  }

  validateSmtpConfiguration(config.smtp);

  if (config.mode === 'capture') {
    validateCaptureConfiguration(config);
  } else {
    validateLiveConfiguration(config);
  }

  return config;
}

function failConfiguration(message: string): never {
  throw new EmailConfigurationError(message);
}

function validateSmtpConfiguration(smtp: SmtpConfig) {
  if (!smtp || !isValidHeader(smtp.host) || /[\s/:]/.test(smtp.host.replace(/^\[?::1\]?$/, 'localhost'))) {
    failConfiguration('Valid SMTP host is required');
  }

  if (!Number.isInteger(smtp.port) || smtp.port < 1 || smtp.port > 65535) {
    failConfiguration('Invalid SMTP port');
  }

  if (!['none', 'starttls', 'implicit'].includes(smtp.tls)) {
    failConfiguration('Explicit SMTP TLS mode is required');
  }

  if (smtp.servername !== undefined && !isValidHeader(smtp.servername)) {
    failConfiguration('Invalid TLS server name');
  }

  if (smtp.auth && (!isValidHeader(smtp.auth.user) || typeof smtp.auth.pass !== 'string' || !smtp.auth.pass)) {
    failConfiguration('SMTP authentication requires user and password');
  }

  for (const timeout of Object.values(smtp.timeouts ?? {})) {
    if (!Number.isInteger(timeout) || timeout < 1 || timeout > 120_000) {
      failConfiguration('Timeouts must be 1–120000 milliseconds');
    }
  }
}

function validateCaptureConfiguration(config: Extract<EmailConfig, { mode: 'capture' }>) {
  const { smtp } = config;

  const allowed = ['localhost', '127.0.0.1', '::1', ...(config.captureHosts ?? [])];

  if (!allowed.includes(smtp.host)) {
    failConfiguration('Capture host must be local or explicitly approved');
  }

  if (smtp.auth && smtp.tls === 'none') {
    failConfiguration('Capture credentials require TLS');
  }
}

function validateLiveConfiguration(config: Extract<EmailConfig, { mode: 'live' }>) {
  const { smtp } = config;

  if (smtp.tls === 'none') {
    failConfiguration('Live SMTP requires TLS');
  }

  if (/\.(test|local|invalid)$/i.test(config.from.address.split('@')[1] ?? '')) {
    failConfiguration('Live mode requires a real sender domain');
  }

  if (config.environment !== 'production' && !config.recipientAllowlist?.length) {
    failConfiguration('Non-production live delivery requires a recipient allowlist');
  }

  if (config.recipientAllowlist) {
    try {
      config.recipientAllowlist = config.recipientAllowlist.map((item) => parseMailbox(item).address.toLowerCase());
    } catch {
      failConfiguration('Invalid recipient allowlist');
    }
  }
}
