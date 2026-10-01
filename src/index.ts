import { randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';

export type Environment = 'development' | 'test' | 'preview' | 'production';
export type Mailbox = { address: string; name?: string };
export type Message = {
  to: string | Mailbox;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string | Mailbox;
  messageId?: string;
};
export type SendResult = { messageId: string; accepted: string[]; rejected: string[] };
export type CapturedMessage = Message & { from: Mailbox; messageId: string };
export type SmtpConfig = {
  host: string;
  port: number;
  tls: 'none' | 'starttls' | 'implicit';
  servername?: string;
  auth?: { user: string; pass: string };
  timeouts?: { connection?: number; greeting?: number; socket?: number; dns?: number };
};
type CommonConfig = { from: Mailbox; environment: Environment };
export type EmailConfig = CommonConfig & (
  | { mode: 'memory' }
  | { mode: 'capture'; smtp: SmtpConfig; captureHosts?: string[] }
  | { mode: 'live'; smtp: SmtpConfig; recipientAllowlist?: string[] }
);
export interface EmailClient {
  send(message: Message): Promise<SendResult>;
  verify(): Promise<void>;
  /** Stops new work and waits for already-started operations. */
  close(): Promise<void>;
  /** Memory mode only. Returns detached copies; never exposes SMTP content. */
  getMessages(): CapturedMessage[];
  clearMessages(): void;
}

export class EmailConfigurationError extends Error {
  constructor(message: string) { super(message); this.name = 'EmailConfigurationError'; }
}
export class EmailMessageError extends Error {
  constructor(message: string) { super(message); this.name = 'EmailMessageError'; }
}
/** Sanitized SMTP failure. No original body, address, credential, or raw response. */
export class EmailSendError extends Error {
  readonly code: string;
  readonly responseCode: number | undefined;
  readonly outcome: 'rejected' | 'uncertain';
  constructor(error: unknown) {
    super('Email transport failed');
    this.name = 'EmailSendError';
    const source = error && typeof error === 'object' ? error as Record<string, unknown> : {};
    this.code = typeof source.code === 'string' && /^[A-Z_0-9]{1,40}$/.test(source.code)
      ? source.code : 'EMAIL_TRANSPORT_ERROR';
    const response = Number(source.responseCode);
    this.responseCode = Number.isInteger(response) && response >= 400 && response <= 599
      ? response : undefined;
    this.outcome = this.responseCode === undefined ? 'uncertain' : 'rejected';
  }
}

function header(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !/[\r\n\0]/.test(value);
}
function mailbox(value: unknown): Mailbox {
  const item = typeof value === 'string' ? { address: value } : value;
  if (!item || typeof item !== 'object') throw new EmailMessageError('Invalid mailbox');
  const { address, name } = item as Mailbox;
  // Deliberately accept one plain mailbox, not address lists or display-name syntax.
  if (!header(address) || !/^[^\s@<>,;"\\]+@[^\s@<>,;"\\]+\.[^\s@<>,;"\\]+$/.test(address))
    throw new EmailMessageError('Expected one email address');
  if (name !== undefined && !header(name)) throw new EmailMessageError('Invalid display name');
  return name === undefined ? { address } : { address, name };
}
function validateMessage(input: Message): Message {
  if (!input || typeof input !== 'object') throw new EmailMessageError('Invalid message');
  const to = mailbox(input.to);
  if (!header(input.subject)) throw new EmailMessageError('Invalid subject');
  if (typeof input.text !== 'string' || !input.text.trim()) throw new EmailMessageError('Text body is required');
  if (input.html !== undefined && typeof input.html !== 'string') throw new EmailMessageError('HTML must be a string');
  if (input.messageId !== undefined && (!header(input.messageId) || !/^<[^\s<>]+@[^\s<>]+>$/.test(input.messageId)))
    throw new EmailMessageError('Invalid message ID');
  return {
    to, subject: input.subject, text: input.text,
    ...(input.html === undefined ? {} : { html: input.html }),
    ...(input.replyTo === undefined ? {} : { replyTo: mailbox(input.replyTo) }),
    ...(input.messageId === undefined ? {} : { messageId: input.messageId }),
  };
}
function validateConfig(input: EmailConfig): EmailConfig {
  // Snapshot configuration so later caller mutations cannot bypass validation.
  const config = structuredClone(input);
  const fail = (message: string): never => { throw new EmailConfigurationError(message); };
  if (!config || !['memory', 'capture', 'live'].includes(config.mode)) fail('Explicit email mode is required');
  if (!['development', 'test', 'preview', 'production'].includes(config.environment)) fail('Explicit environment is required');
  try { config.from = mailbox(config.from); } catch { fail('Valid sender mailbox is required'); }
  if (config.environment === 'production' && config.mode !== 'live') fail('Production requires live mode');
  if (config.mode === 'memory') return config;
  const smtp = config.smtp;
  if (!smtp || !header(smtp.host) || /[\s/:]/.test(smtp.host.replace(/^\[?::1\]?$/, 'localhost')))
    fail('Valid SMTP host is required');
  if (!Number.isInteger(smtp.port) || smtp.port < 1 || smtp.port > 65535) fail('Invalid SMTP port');
  if (!['none', 'starttls', 'implicit'].includes(smtp.tls)) fail('Explicit SMTP TLS mode is required');
  if (smtp.servername !== undefined && !header(smtp.servername)) fail('Invalid TLS server name');
  if (smtp.auth && (!header(smtp.auth.user) || typeof smtp.auth.pass !== 'string' || !smtp.auth.pass))
    fail('SMTP authentication requires user and password');
  for (const timeout of Object.values(smtp.timeouts ?? {})) {
    if (!Number.isInteger(timeout) || timeout < 1 || timeout > 120_000) fail('Timeouts must be 1–120000 milliseconds');
  }
  if (config.mode === 'capture') {
    const allowed = ['localhost', '127.0.0.1', '::1', ...(config.captureHosts ?? [])];
    if (!allowed.includes(smtp.host)) fail('Capture host must be local or explicitly approved');
    if (smtp.auth && smtp.tls === 'none') fail('Capture credentials require TLS');
  } else {
    if (smtp.tls === 'none') fail('Live SMTP requires TLS');
    if (/\.(test|local|invalid)$/i.test(config.from.address.split('@')[1] ?? '')) fail('Live mode requires a real sender domain');
    if (config.environment !== 'production' && !config.recipientAllowlist?.length)
      fail('Non-production live delivery requires a recipient allowlist');
    if (config.recipientAllowlist) {
      try { config.recipientAllowlist = config.recipientAllowlist.map(item => mailbox(item).address.toLowerCase()); }
      catch { fail('Invalid recipient allowlist'); }
    }
  }
  return config;
}

export function createEmailClient(input: EmailConfig): EmailClient {
  const config = validateConfig(input);
  let transport: Transporter<SMTPTransport.SentMessageInfo> | undefined;
  let closed = false;
  let closing: Promise<void> | undefined;
  const pending = new Set<Promise<unknown>>();
  const messages: CapturedMessage[] = [];
  function smtpTransport() {
    if (config.mode === 'memory') throw new Error('Memory mode has no SMTP transport');
    const smtp = config.smtp;
    return transport ??= nodemailer.createTransport({
      host: smtp.host, port: smtp.port,
      secure: smtp.tls === 'implicit', requireTLS: smtp.tls === 'starttls', ignoreTLS: smtp.tls === 'none',
      tls: { rejectUnauthorized: true, ...(smtp.servername ? { servername: smtp.servername } : {}) },
      ...(smtp.auth ? { auth: smtp.auth } : {}),
      connectionTimeout: smtp.timeouts?.connection ?? 10_000,
      greetingTimeout: smtp.timeouts?.greeting ?? 10_000,
      socketTimeout: smtp.timeouts?.socket ?? 30_000,
      dnsTimeout: smtp.timeouts?.dns ?? 10_000,
      pool: false, logger: false, debug: false,
      disableFileAccess: true, disableUrlAccess: true,
    });
  }
  async function run<T>(action: () => Promise<T>): Promise<T> {
    if (closed) throw new EmailMessageError('Email client is closed');
    const operation = action();
    pending.add(operation);
    try { return await operation; } finally { pending.delete(operation); }
  }
  function memoryOnly() {
    if (config.mode !== 'memory') throw new EmailMessageError('Inbox access requires memory mode');
  }
  return {
    send(input) {
      return run(async () => {
        const message = validateMessage(input);
        const to = mailbox(message.to).address;
        if (config.mode === 'live' && config.recipientAllowlist && !config.recipientAllowlist.includes(to.toLowerCase()))
          throw new EmailMessageError('Recipient is outside the live delivery allowlist');
        const messageId = message.messageId ?? `<${randomUUID()}@${config.from.address.split('@')[1]}>`;
        if (config.mode === 'memory') {
          messages.push(structuredClone({ ...message, from: config.from, messageId }));
          return { messageId, accepted: [to], rejected: [] };
        }
        try {
          const result = await smtpTransport().sendMail({ ...message, from: config.from, messageId });
          const address = (value: string | Mailbox) => typeof value === 'string' ? value : value.address;
          return { messageId: result.messageId, accepted: result.accepted.map(address), rejected: result.rejected.map(address) };
        } catch (error) { throw new EmailSendError(error); }
      });
    },
    verify() {
      return run(async () => {
        if (config.mode === 'memory') return;
        try { await smtpTransport().verify(); } catch (error) { throw new EmailSendError(error); }
      });
    },
    close() {
      closed = true;
      return closing ??= Promise.allSettled([...pending]).then(() => { transport?.close(); });
    },
    getMessages() { memoryOnly(); return structuredClone(messages); },
    clearMessages() { memoryOnly(); messages.length = 0; },
  };
}
