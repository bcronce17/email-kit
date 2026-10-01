import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { createEmailClient, EmailConfigurationError, EmailMessageError, EmailSendError } from '../dist/index.js';

const base = { environment: 'test', from: { name: 'Test', address: 'sender@example.test' } };
const message = { to: 'recipient@example.test', subject: 'Verification', text: 'Follow the link', html: '<p>Follow the link</p>' };
const capture = (port, overrides = {}) => ({ ...base, mode: 'capture', smtp: { host: '127.0.0.1', port, tls: 'none', ...overrides } });

// Real wire-level SMTP fixture: tracks attempts and can lose the acknowledgement after DATA.
async function smtp(t, behavior = 'accept') {
  const state = { connections: 0, attempts: 0, bodies: [], commands: [] };
  const sockets = new Set();
  const server = net.createServer(socket => {
    sockets.add(socket);
    socket.on('error', () => {});
    socket.on('close', () => sockets.delete(socket));
    state.connections++;
    if (behavior === 'silent') return;
    socket.write('220 fixture ESMTP\r\n');
    let buffer = '';
    let data = false;
    let body = '';
    socket.on('data', chunk => {
      buffer += chunk.toString();
      let index;
      while ((index = buffer.indexOf('\r\n')) !== -1) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        if (data) {
          if (line !== '.') { body += `${line}\r\n`; continue; }
          state.attempts++;
          state.bodies.push(body);
          body = '';
          data = false;
          if (behavior === 'disconnect') { socket.destroy(); return; }
          socket.write('250 accepted\r\n');
          continue;
        }
        state.commands.push(line);
        if (/^EHLO/.test(line)) socket.write('250-fixture\r\n250 8BITMIME\r\n');
        else if (/^HELO|^MAIL FROM/.test(line)) socket.write('250 OK\r\n');
        else if (/^RCPT TO/.test(line)) socket.write(behavior === 'reject' ? '550 mailbox rejected\r\n' : '250 OK\r\n');
        else if (line === 'DATA') { data = true; socket.write('354 send data\r\n'); }
        else if (line === 'QUIT') socket.end('221 bye\r\n');
        else socket.write('502 unsupported\r\n');
      }
    });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise(resolve => server.close(resolve));
  });
  return { ...state, state, port: server.address().port };
}

test('memory inbox isolates input/output, preserves caller IDs, clears, and closes', async () => {
  const client = createEmailClient({ ...base, mode: 'memory' });
  const input = { ...message, to: { address: message.to, name: 'Recipient' }, messageId: '<caller@example.test>' };
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
    capture(0), capture(1025, { auth: { user: 'user' } }),
    capture(1025, { host: 'smtp.external.example' }),
    capture(1025, { timeouts: { socket: 0 } }),
    { ...base, mode: 'live', smtp: { host: 'smtp.example.com', port: 587, tls: 'none' } },
    { ...base, from: { address: 'sender@example.com' }, mode: 'live', smtp: { host: 'smtp.example.com', port: 587, tls: 'starttls' } },
  ];
  for (const config of invalid) assert.throws(() => createEmailClient(config), EmailConfigurationError);
  assert.doesNotThrow(() => createEmailClient({ ...capture(1025, { host: 'mail' }), captureHosts: ['mail'] }));
});

test('validates runtime messages and ignores undeclared transport fields', async () => {
  const client = createEmailClient({ ...base, mode: 'memory' });
  for (const patch of [
    { to: 'one@example.test,two@example.test' }, { subject: 'bad\r\nBcc: victim@example.test' },
    { text: { path: '/etc/passwd' } }, { html: { href: 'https://example.com' } },
    { replyTo: 'invalid' }, { messageId: 'bad\nID' },
  ]) await assert.rejects(client.send({ ...message, ...patch }), EmailMessageError);
  await client.send({ ...message, bcc: 'victim@example.test', attachments: [{ path: '/etc/passwd' }] });
  assert.equal('bcc' in client.getMessages()[0], false);
  assert.equal('attachments' in client.getMessages()[0], false);
});

test('non-production live allowlist is enforced and snapshotted', async () => {
  const config = { ...base, from: { address: 'sender@example.com' }, mode: 'live',
    smtp: { host: 'smtp.example.com', port: 587, tls: 'starttls' }, recipientAllowlist: ['permitted@example.test'] };
  const client = createEmailClient(config);
  config.recipientAllowlist.push(message.to);
  await assert.rejects(client.send(message), /allowlist/);
  await client.close();
});

test('SMTP accepts text/HTML and preserves message ID without authenticating', async t => {
  const fixture = await smtp(t);
  const client = createEmailClient(capture(fixture.port));
  assert.equal(fixture.state.connections, 0);
  await client.verify();
  const result = await client.send({ ...message, messageId: '<announcement-delivery-claim@gather.local>' });
  assert.deepEqual(result, { messageId: '<announcement-delivery-claim@gather.local>', accepted: [message.to], rejected: [] });
  assert.equal(fixture.state.attempts, 1);
  assert.match(fixture.state.bodies[0], /multipart\/alternative/);
  assert.match(fixture.state.bodies[0], /Follow the link/);
  assert.equal(fixture.state.commands.some(line => line.startsWith('AUTH')), false);
  assert.throws(() => client.getMessages(), EmailMessageError);
  await client.close();
});

test('SMTP rejection preserves Gather-compatible status without raw recipient data', async t => {
  const fixture = await smtp(t, 'reject');
  const client = createEmailClient(capture(fixture.port));
  await assert.rejects(client.send(message), error => {
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

test('disconnect after DATA is uncertain and never automatically resent', async t => {
  const fixture = await smtp(t, 'disconnect');
  const client = createEmailClient(capture(fixture.port));
  await assert.rejects(client.send(message), error => error instanceof EmailSendError && error.outcome === 'uncertain' && error.responseCode === undefined);
  assert.equal(fixture.state.attempts, 1);
  assert.equal(fixture.state.connections, 1);
  await client.close();
});

test('greeting timeout is bounded and sanitized', async t => {
  const fixture = await smtp(t, 'silent');
  const client = createEmailClient(capture(fixture.port, { timeouts: { greeting: 50 } }));
  await assert.rejects(client.send(message), error => error instanceof EmailSendError && error.code === 'ETIMEDOUT');
  await client.close();
});

test('required STARTTLS fails rather than delivering plaintext', async t => {
  const fixture = await smtp(t);
  const client = createEmailClient(capture(fixture.port, { tls: 'starttls' }));
  await assert.rejects(client.send(message), EmailSendError);
  assert.equal(fixture.state.attempts, 0);
  await client.close();
});

test('close drains an already-started send and rejects new work', async t => {
  const fixture = await smtp(t);
  const client = createEmailClient(capture(fixture.port));
  const send = client.send(message);
  const close = client.close();
  await assert.rejects(client.send(message), /closed/);
  assert.deepEqual((await send).accepted, [message.to]);
  await close;
  assert.equal(fixture.state.attempts, 1);
});
