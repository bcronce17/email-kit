import assert from 'node:assert/strict';
import { createEmailClient, EmailSendError } from '@brim-software/email-kit';
import { renderVerificationEmail, renderAnnouncementEmail } from '@brim-software/email-kit/templates';

const rendered = renderVerificationEmail({
  brand: { name: 'External app' },
  actionUrl: 'https://example.com/verify',
  expirationText: 'Expires in 1 hour.'
});

assert.ok(rendered.html.includes('External app'));
assert.ok(rendered.text.includes('https://example.com/verify'));
assert.ok(
  renderAnnouncementEmail({
    brand: { name: 'External app' },
    senderName: 'Community',
    title: 'News',
    body: 'Hello',
    actionUrl: 'https://example.com/news'
  }).html.includes('News')
);

for (const name of ['Waiger', 'Keystone', 'Gather']) {
  const client = createEmailClient({
    mode: 'memory',
    environment: 'test',
    from: { name, address: 'sender@example.test' }
  });

  const result = await client.send({
    to: 'member@example.test',
    subject: name,
    text: 'Your verification link',
    messageId: '<caller@example.test>'
  });

  assert.deepEqual(result.accepted, ['member@example.test']);
  assert.equal(result.messageId, '<caller@example.test>');

  await client.close();
}

const error = new EmailSendError({ responseCode: 550, code: 'EENVELOPE', response: 'private token' });

assert.equal(error.responseCode, 550);
assert.equal(JSON.stringify(error).includes('private token'), false);

console.log('Packed ESM import, declarations, and consumer adapter contracts passed');
