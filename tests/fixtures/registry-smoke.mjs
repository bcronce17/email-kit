import assert from 'node:assert/strict';
import { createEmailClient } from '@brim-software/email-kit';
import { renderVerificationEmail, renderAnnouncementEmail } from '@brim-software/email-kit/templates';

const client = createEmailClient({
  mode: 'memory',
  environment: 'test',
  from: { address: 'sender@example.test' }
});
const message = renderVerificationEmail({
  brand: { name: 'External app' },
  actionUrl: 'https://example.com/verify',
  expirationText: 'Expires in 1 hour.'
});

await client.send({ to: 'member@example.test', ...message });

assert.equal(client.getMessages().length, 1);
assert.ok(client.getMessages()[0].html.includes('External app'));
assert.ok(
  renderAnnouncementEmail({
    brand: { name: 'External app' },
    senderName: 'Community',
    title: 'News',
    body: 'Hello',
    actionUrl: 'https://example.com/news'
  }).text.includes('Hello')
);

await client.close();
console.log('Anonymous registry install, template imports, and sending passed');
