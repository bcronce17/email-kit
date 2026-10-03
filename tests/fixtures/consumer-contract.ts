import { createEmailClient, type SendResult } from '@brim-software/email-kit';
import {
  renderVerificationEmail,
  renderPortalInvitationEmail,
  renderNotificationEmail,
  type EmailBrand
} from '@brim-software/email-kit/templates';
import { waigerEmail, accountEmail } from './consumers.js';

const memory = createEmailClient({
  mode: 'memory',
  environment: 'test',
  from: { address: 'sender@example.test' }
});

const result: SendResult = await memory.send({ to: 'recipient@example.test', subject: 'Test', text: 'Test' });

const authCallback: (input: { user: { email: string }; url: string }) => Promise<void> = async ({ user, url }) => {
  await accountEmail({
    mode: 'memory',
    environment: 'test',
    from: { address: 'sender@example.test' }
  }).sendAccountEmail(user.email, 'Verify', url);
};

const brand: EmailBrand = { name: 'External app', accentColor: '#245c45' };
const message = renderVerificationEmail({
  brand,
  actionUrl: 'https://example.com/verify',
  expirationText: 'Expires in 1 hour.'
});

await memory.send({ to: 'recipient@example.test', ...message });
renderPortalInvitationEmail({
  brand,
  actionUrl: 'https://example.com/invite',
  expirationText: 'Expires tomorrow.',
  communityName: 'Community'
});
renderNotificationEmail({
  brand,
  subject: 'Update',
  heading: 'Update',
  summary: 'Review the update.',
  actionUrl: 'https://example.com/update'
});
void result;
void authCallback;
void waigerEmail;
