// Copy these adapters into server-only application code. Read secrets in the app.
import { createEmailClient, type EmailConfig, type Environment } from '@brim-software/email-kit';

type WaigerSmtpSettings = {
  from: string;
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
};

export function waigerEmail(
  smtp: WaigerSmtpSettings,
  environment: Environment,
  mode: 'capture' | 'live',
  recipientAllowlist?: string[]
) {
  return createEmailClient({
    environment,
    mode,
    from: { name: 'Waiger', address: smtp.from },
    smtp: {
      host: smtp.host,
      port: smtp.port,
      tls: mode === 'capture' ? 'none' : smtp.secure ? 'implicit' : 'starttls',
      ...(smtp.user ? { auth: { user: smtp.user, pass: smtp.password ?? '' } } : {})
    },
    ...(mode === 'live' && recipientAllowlist ? { recipientAllowlist } : {})
  });
}

// Create one adapter per server instance from explicit app config.
export function accountEmail(config: EmailConfig) {
  const email = createEmailClient(config);

  return {
    email,
    // Compatible with Better Auth's async sendVerificationEmail/sendResetPassword callbacks.
    async sendAccountEmail(to: string, subject: string, url: string) {
      await email.send({ to, subject, text: `${subject}\n\n${url}` });
    },
    // Gather retains its worker, claim fencing, message content, and error classification.
    sendAnnouncement(to: string, subject: string, text: string, html: string, messageId: string) {
      return email.send({ to, subject, text, html, messageId });
    }
  };
}
