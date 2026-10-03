import { randomUUID } from 'node:crypto';
import type { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import type { EmailConfig, EmailClient, CapturedMessage, Mailbox } from './types.js';
import { EmailMessageError, EmailSendError } from './errors.js';
import { validateMessage, validateConfiguration } from './validation.js';
import { createSmtpTransport } from './smtp.js';

export type * from './types.js';

export { EmailConfigurationError, EmailMessageError, EmailSendError } from './errors.js';

function mailboxAddress(value: string | Mailbox): string {
  return typeof value === 'string' ? value : value.address;
}

export function createEmailClient(input: EmailConfig): EmailClient {
  const config = validateConfiguration(input);
  let transport: Transporter<SMTPTransport.SentMessageInfo> | undefined;
  let closed = false;
  let closing: Promise<void> | undefined;
  const pending = new Set<Promise<unknown>>();
  const messages: CapturedMessage[] = [];

  function getSmtpTransport() {
    if (config.mode === 'memory') {
      throw new Error('Memory mode has no SMTP transport');
    }

    const smtp = config.smtp;

    return (transport ??= createSmtpTransport(smtp));
  }

  async function runOperation<T>(action: () => Promise<T>): Promise<T> {
    if (closed) {
      throw new EmailMessageError('Email client is closed');
    }

    const operation = action();

    pending.add(operation);

    try {
      return await operation;
    } finally {
      pending.delete(operation);
    }
  }

  function requireMemoryMode() {
    if (config.mode !== 'memory') {
      throw new EmailMessageError('Inbox access requires memory mode');
    }
  }

  return {
    send(input) {
      return runOperation(async () => {
        const message = validateMessage(input);
        const to = mailboxAddress(message.to);

        if (
          config.mode === 'live' &&
          config.recipientAllowlist &&
          !config.recipientAllowlist.includes(to.toLowerCase())
        ) {
          throw new EmailMessageError('Recipient is outside the live delivery allowlist');
        }

        const messageId = message.messageId ?? `<${randomUUID()}@${config.from.address.split('@')[1]}>`;

        if (config.mode === 'memory') {
          messages.push(structuredClone({ ...message, from: config.from, messageId }));

          return { messageId, accepted: [to], rejected: [] };
        }

        try {
          const result = await getSmtpTransport().sendMail({ ...message, from: config.from, messageId });

          return {
            messageId: result.messageId,
            accepted: result.accepted.map(mailboxAddress),
            rejected: result.rejected.map(mailboxAddress)
          };
        } catch (error) {
          throw new EmailSendError(error);
        }
      });
    },
    verify() {
      return runOperation(async () => {
        if (config.mode === 'memory') {
          return;
        }

        try {
          await getSmtpTransport().verify();
        } catch (error) {
          throw new EmailSendError(error);
        }
      });
    },
    close() {
      closed = true;

      return (closing ??= Promise.allSettled([...pending]).then(() => {
        transport?.close();
      }));
    },
    getMessages() {
      requireMemoryMode();

      return structuredClone(messages);
    },
    clearMessages() {
      requireMemoryMode();
      messages.length = 0;
    }
  };
}
