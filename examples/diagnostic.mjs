// Run with explicit app environment configuration; this script never loads secrets itself.
import { createEmailClient } from '@brim-software/email-kit';

function readConfiguration(environment) {
  const mode = environment.EMAIL_MODE;
  const config = {
    mode,
    environment: environment.EMAIL_ENVIRONMENT,
    from: {
      name: environment.EMAIL_FROM_NAME || 'Email diagnostic',
      address: environment.EMAIL_FROM
    }
  };

  if (mode !== 'memory') {
    config.smtp = {
      host: environment.EMAIL_SMTP_HOST,
      port: Number(environment.EMAIL_SMTP_PORT),
      tls: environment.EMAIL_SMTP_TLS
    };

    if (environment.EMAIL_SMTP_USER || environment.EMAIL_SMTP_PASSWORD) {
      config.smtp.auth = { user: environment.EMAIL_SMTP_USER, pass: environment.EMAIL_SMTP_PASSWORD };
    }
  }

  if (mode === 'capture' && environment.EMAIL_CAPTURE_HOSTS) {
    config.captureHosts = environment.EMAIL_CAPTURE_HOSTS.split(',');
  }

  if (mode === 'live' && environment.EMAIL_RECIPIENT_ALLOWLIST) {
    config.recipientAllowlist = environment.EMAIL_RECIPIENT_ALLOWLIST.split(',');
  }

  return config;
}

function requireLiveSendOptIn(environment) {
  if (environment.EMAIL_MODE !== 'live') {
    return;
  }

  if (process.argv[3] !== '--live') {
    throw new Error('Live test requires explicit --live');
  }

  if (!environment.EMAIL_RECIPIENT_ALLOWLIST) {
    throw new Error('Live diagnostic requires an allowlist');
  }
}

const environment = process.env;
const email = createEmailClient(readConfiguration(environment));

try {
  const action = process.argv[2] || 'check';

  if (action === 'check') {
    await email.verify();
    console.log('Email configuration and transport check passed');
  } else if (action === 'test') {
    requireLiveSendOptIn(environment);

    await email.send({
      to: environment.EMAIL_TEST_TO || 'diagnostic@example.test',
      subject: 'Email diagnostic',
      text: 'The shared email client sent this diagnostic message.'
    });

    console.log('Email diagnostic accepted by transport');
  } else {
    throw new Error('Expected check or test');
  }
} finally {
  await email.close();
}
