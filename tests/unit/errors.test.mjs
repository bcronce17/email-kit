import { test, expect } from 'vitest';
import { EmailSendError } from '../../src/index.ts';

test('transport errors omit original messages, recipients, responses, and causes', () => {
  const error = new EmailSendError({
    code: 'EENVELOPE',
    responseCode: 550,
    message: 'recipient@example.test was rejected',
    response: 'private-auth-token',
    cause: new Error('SMTP credential')
  });

  expect(error.message).toBe('Email transport failed');
  expect(error.code).toBe('EENVELOPE');
  expect(error.responseCode).toBe(550);
  expect(error.outcome).toBe('rejected');
  expect(error).not.toHaveProperty('cause');
  expect(JSON.stringify(error)).not.toMatch(/recipient|private-auth-token|SMTP credential/);
});

test.each([null, undefined, 'private response', { code: 'TOKEN=private', responseCode: 200 }])(
  'unknown transport failures are sanitized: %j',
  (source) => {
    const error = new EmailSendError(source);

    expect(error.code).toBe('EMAIL_TRANSPORT_ERROR');
    expect(error.responseCode).toBeUndefined();
    expect(error.outcome).toBe('uncertain');
  }
);

test.each([
  Symbol('synthetic-response'),
  {
    valueOf() {
      throw new Error('synthetic-private-response');
    }
  }
])('malformed response codes stay sanitized without coercing objects: %j', (responseCode) => {
  const error = new EmailSendError({ code: 'ESMTP', responseCode });

  expect(error.message).toBe('Email transport failed');
  expect(error.responseCode).toBeUndefined();
  expect(error.outcome).toBe('uncertain');
});
