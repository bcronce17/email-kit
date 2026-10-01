// Run with explicit app environment configuration; this script never loads secrets itself.
import { createEmailClient } from '@bcronce/app-email';

const env = process.env;
const mode = env.EMAIL_MODE;
const email = createEmailClient({
  mode,
  environment: env.EMAIL_ENVIRONMENT,
  from: { name: env.EMAIL_FROM_NAME || 'Email diagnostic', address: env.EMAIL_FROM },
  ...(mode === 'memory' ? {} : {
    smtp: {
      host: env.EMAIL_SMTP_HOST,
      port: Number(env.EMAIL_SMTP_PORT),
      tls: env.EMAIL_SMTP_TLS,
      ...(env.EMAIL_SMTP_USER || env.EMAIL_SMTP_PASSWORD ? {
        auth: { user: env.EMAIL_SMTP_USER, pass: env.EMAIL_SMTP_PASSWORD },
      } : {}),
    },
  }),
  ...(mode === 'capture' && env.EMAIL_CAPTURE_HOSTS ? { captureHosts: env.EMAIL_CAPTURE_HOSTS.split(',') } : {}),
  ...(mode === 'live' && env.EMAIL_RECIPIENT_ALLOWLIST ? { recipientAllowlist: env.EMAIL_RECIPIENT_ALLOWLIST.split(',') } : {}),
});

try {
  const action = process.argv[2] || 'check';
  if (action === 'check') {
    await email.verify();
    console.log('Email configuration and transport check passed');
  } else if (action === 'test') {
    if (mode === 'live' && process.argv[3] !== '--live') throw new Error('Live test requires explicit --live');
    if (mode === 'live' && !env.EMAIL_RECIPIENT_ALLOWLIST) throw new Error('Live diagnostic requires an allowlist');
    await email.send({
      to: env.EMAIL_TEST_TO || 'diagnostic@example.test',
      subject: 'Email diagnostic', text: 'The shared email client sent this diagnostic message.',
    });
    console.log('Email diagnostic accepted by transport');
  } else throw new Error('Expected check or test');
} finally { await email.close(); }
