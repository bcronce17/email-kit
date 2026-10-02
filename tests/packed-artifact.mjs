import { mkdtemp, writeFile, cp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const archiveName = metadata.name.replace(/^@/, '').replaceAll('/', '-') + '-' + metadata.version + '.tgz';
const consumer = await mkdtemp(join(tmpdir(), 'email-kit-consumer-'));
const run = (command, args, cwd = consumer) => execFileSync(command, args, { cwd, stdio: 'inherit' });
run('npm', ['pack', '--pack-destination', consumer], root);
await writeFile(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
run('npm', ['install', '--prefer-offline', '--ignore-scripts', resolve(consumer, archiveName)]);
await cp(join(root, 'examples/consumers.ts'), join(consumer, 'consumers.ts'));
await writeFile(join(consumer, 'contract.ts'), `
import { createEmailClient, type SendResult } from '${metadata.name}';
import { renderVerificationEmail, renderPortalInvitationEmail, renderNotificationEmail, type EmailBrand } from '${metadata.name}/templates';
import { waigerEmail, accountEmail } from './consumers.js';
const memory = createEmailClient({ mode: 'memory', environment: 'test', from: { address: 'sender@example.test' } });
const result: SendResult = await memory.send({ to: 'recipient@example.test', subject: 'Test', text: 'Test' });
const authCallback: (input: { user: { email: string }; url: string }) => Promise<void> = async ({ user, url }) => {
  await accountEmail({ mode: 'memory', environment: 'test', from: { address: 'sender@example.test' } }).sendAccountEmail(user.email, 'Verify', url);
};
const brand: EmailBrand = { name: 'External app', accentColor: '#245c45' };
const message = renderVerificationEmail({ brand, actionUrl: 'https://example.com/verify', expirationText: 'Expires in 1 hour.' });
await memory.send({ to: 'recipient@example.test', ...message });
renderPortalInvitationEmail({ brand, actionUrl: 'https://example.com/invite', expirationText: 'Expires tomorrow.', communityName: 'Community' });
renderNotificationEmail({ brand, subject: 'Update', heading: 'Update', summary: 'Review the update.', actionUrl: 'https://example.com/update' });
void result; void authCallback; void waigerEmail;
`);
run(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--strict', '--skipLibCheck', '--noEmit', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', 'contract.ts']);
await writeFile(join(consumer, 'smoke.mjs'), `
import assert from 'node:assert/strict';
import { createEmailClient, EmailSendError } from '${metadata.name}';
import { renderVerificationEmail, renderAnnouncementEmail } from '${metadata.name}/templates';
const rendered = renderVerificationEmail({ brand: { name: 'External app' }, actionUrl: 'https://example.com/verify', expirationText: 'Expires in 1 hour.' });
assert.ok(rendered.html.includes('External app'));
assert.ok(rendered.text.includes('https://example.com/verify'));
assert.ok(renderAnnouncementEmail({ brand: { name: 'External app' }, senderName: 'Community', title: 'News', body: 'Hello', actionUrl: 'https://example.com/news' }).html.includes('News'));
for (const name of ['Waiger', 'Keystone', 'Gather']) {
  const client = createEmailClient({ mode: 'memory', environment: 'test', from: { name, address: 'sender@example.test' } });
  const result = await client.send({ to: 'member@example.test', subject: name, text: 'Your verification link', messageId: '<caller@example.test>' });
  assert.deepEqual(result.accepted, ['member@example.test']);
  assert.equal(result.messageId, '<caller@example.test>');
  await client.close();
}
const error = new EmailSendError({ responseCode: 550, code: 'EENVELOPE', response: 'private token' });
assert.equal(error.responseCode, 550);
assert.equal(JSON.stringify(error).includes('private token'), false);
console.log('Packed ESM import, declarations, and consumer adapter contracts passed');
`);
run(process.execPath, ['smoke.mjs']);
console.log(`Isolated consumer retained at ${consumer}`);
