import { test, onTestFinished } from 'vitest';
import assert from 'node:assert/strict';
import { createEmailClient, EmailMessageError, EmailSendError } from '../../src/index.ts';
import { message, capture } from '../support/messages.mjs';
import { createSmtpFixture } from '../support/smtp.mjs';

async function startSmtpFixture(behavior, overrides = {}) {
  const fixture = await createSmtpFixture(behavior);

  const client = createEmailClient(capture(fixture.port, overrides));

  onTestFinished(async () => {
    try {
      await client.close();
    } finally {
      await fixture.close();
    }
  });

  return { ...fixture, client };
}

test('SMTP accepts text/HTML and preserves message ID without authenticating', async () => {
  const fixture = await startSmtpFixture();

  const { client } = fixture;

  assert.equal(fixture.state.connections, 0);

  await client.verify();

  const result = await client.send({ ...message, messageId: '<delivery-claim@example.test>' });

  assert.deepEqual(result, {
    messageId: '<delivery-claim@example.test>',
    accepted: [message.to],
    rejected: []
  });
  assert.equal(fixture.state.attempts, 1);
  assert.match(fixture.state.bodies[0], /multipart\/alternative/);
  assert.match(fixture.state.bodies[0], /Follow the link/);
  assert.equal(
    fixture.state.commands.some((line) => line.startsWith('AUTH')),
    false
  );
  assert.throws(() => client.getMessages(), EmailMessageError);

  await client.close();
});

test('SMTP rejection preserves rejection status without raw recipient data', async () => {
  const fixture = await startSmtpFixture('reject');

  const { client } = fixture;

  await assert.rejects(client.send(message), (error) => {
    assert.ok(error instanceof EmailSendError);
    assert.equal(error.responseCode, 550);
    assert.equal(error.outcome, 'rejected');
    assert.equal(error.code, 'EENVELOPE');
    assert.equal(JSON.stringify(error).includes(message.to), false);

    return true;
  });

  assert.equal(fixture.state.attempts, 0);
  assert.equal(fixture.state.connections, 1);

  await client.close();
});

test('disconnect after DATA is uncertain and never automatically resent', async () => {
  const fixture = await startSmtpFixture('disconnect');

  const { client } = fixture;

  await assert.rejects(
    client.send(message),
    (error) => error instanceof EmailSendError && error.outcome === 'uncertain' && error.responseCode === undefined
  );

  assert.equal(fixture.state.attempts, 1);
  assert.equal(fixture.state.connections, 1);

  await client.close();
});

test('greeting timeout is bounded and sanitized', async () => {
  const fixture = await startSmtpFixture('silent', { timeouts: { greeting: 50 } });

  const { client } = fixture;

  await assert.rejects(client.send(message), (error) => error instanceof EmailSendError && error.code === 'ETIMEDOUT');
  await client.close();
});

test('required STARTTLS fails rather than delivering plaintext', async () => {
  const fixture = await startSmtpFixture('accept', { tls: 'starttls' });

  const { client } = fixture;

  await assert.rejects(client.send(message), EmailSendError);

  assert.equal(fixture.state.attempts, 0);

  await client.close();
});

test('close drains an already-started send and rejects new work', async () => {
  const fixture = await startSmtpFixture();

  const { client } = fixture;
  const send = client.send(message);
  const close = client.close();

  await assert.rejects(client.send(message), /closed/);

  assert.deepEqual((await send).accepted, [message.to]);

  await close;

  assert.equal(fixture.state.attempts, 1);
});
