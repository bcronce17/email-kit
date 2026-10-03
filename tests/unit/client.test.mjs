import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createEmailClient, EmailConfigurationError, EmailMessageError } from '../../src/index.ts';
import { base, message, capture } from '../support/messages.mjs';

test('memory inbox isolates input/output, preserves caller IDs, clears, and closes', async () => {
  const client = createEmailClient({ ...base, mode: 'memory' });
  const input = {
    ...message,
    to: { address: message.to, name: 'Recipient' },
    messageId: '<caller@example.test>'
  };

  const result = await client.send(input);

  input.to.name = 'Mutated';

  assert.deepEqual(result, { messageId: '<caller@example.test>', accepted: [message.to], rejected: [] });

  const inbox = client.getMessages();

  assert.equal(inbox[0].to.name, 'Recipient');

  inbox[0].to.address = 'changed@example.test';

  assert.equal(client.getMessages()[0].to.address, message.to);

  client.clearMessages();

  assert.equal(client.getMessages().length, 0);

  await client.verify();
  await client.close();
  await assert.rejects(client.send(message), EmailMessageError);
  await assert.rejects(client.verify(), EmailMessageError);
});

test('configuration fails safely before connecting', () => {
  const invalid = [
    { ...base, mode: 'memory', environment: 'production' },
    { ...base, mode: 'unknown' },
    capture(0),
    capture(1025, { auth: { user: 'user' } }),
    capture(1025, { host: 'smtp.external.example' }),
    capture(1025, { timeouts: { socket: 0 } }),
    { ...base, mode: 'live', smtp: { host: 'smtp.example.com', port: 587, tls: 'none' } },
    {
      ...base,
      from: { address: 'sender@example.com' },
      mode: 'live',
      smtp: { host: 'smtp.example.com', port: 587, tls: 'starttls' }
    }
  ];

  for (const config of invalid) {
    assert.throws(() => createEmailClient(config), EmailConfigurationError);
  }

  assert.doesNotThrow(() => createEmailClient({ ...capture(1025, { host: 'mail' }), captureHosts: ['mail'] }));
});

test('validates runtime messages and ignores undeclared transport fields', async () => {
  const client = createEmailClient({ ...base, mode: 'memory' });

  for (const patch of [
    { to: 'one@example.test,two@example.test' },
    { subject: 'bad\r\nBcc: victim@example.test' },
    { text: { path: '/etc/passwd' } },
    { html: { href: 'https://example.com' } },
    { replyTo: 'invalid' },
    { messageId: 'bad\nID' }
  ]) {
    await assert.rejects(client.send({ ...message, ...patch }), EmailMessageError);
  }

  await client.send({ ...message, bcc: 'victim@example.test', attachments: [{ path: '/etc/passwd' }] });

  assert.equal('bcc' in client.getMessages()[0], false);
  assert.equal('attachments' in client.getMessages()[0], false);
});

test('non-production live allowlist is enforced and snapshotted', async () => {
  const config = {
    ...base,
    from: { address: 'sender@example.com' },
    mode: 'live',
    smtp: { host: 'smtp.example.com', port: 587, tls: 'starttls' },
    recipientAllowlist: ['permitted@example.test']
  };
  const client = createEmailClient(config);

  config.recipientAllowlist.push(message.to);
  await assert.rejects(client.send(message), /allowlist/);
  await client.close();
});
