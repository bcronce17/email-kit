import { test } from 'vitest';
import assert from 'node:assert/strict';
import * as templates from '../../src/templates.ts';
import { base, templateCases } from '../support/templates.mjs';

const cases = templateCases.map(([name, renderer, options]) => [name, templates[renderer], options]);
const contentTemplates = ['announcement', 'official notice', 'notification'];
const tokenCases = cases.filter(([name]) => !contentTemplates.includes(name));
const contentCases = cases.filter(([name]) => contentTemplates.includes(name));

const unsafeLinks = [
  'javascript:alert(1)',
  'data:text/html,hello',
  'https://user:pass@example.com',
  'http://example.com',
  'https://evil.example/action',
  'https://example.com.evil.test',
  'https://example.com/\nsecret'
];

test.each(cases)('%s includes matching safe links, body text, and branding', (_name, render, options) => {
  const mail = render(options);

  assert.ok(mail.subject.length);
  assert.ok(mail.text.includes(base.actionUrl));
  assert.match(mail.html, /Example &amp; Co/);
  assert.match(mail.html, /token=abc&amp;next=home/);
  assert.match(mail.html, /role="presentation"/);
  assert.match(mail.html, /color:#000000;font-size:16px/);
  assert.ok(!mail.html.includes('<script'));
});

test.each(tokenCases)('%s requires app-owned expiry wording', (_name, render, options) => {
  assert.ok(render(options).text.includes(base.expirationText));
  assert.throws(() => render({ ...options, expirationText: undefined }), templates.EmailTemplateError);
  assert.throws(() => render({ ...options, expirationText: '' }), templates.EmailTemplateError);
});

test.each(contentCases)('%s does not invent token expiry', (_name, render, options) => {
  const { expirationText, ...contentOptions } = options;

  assert.ok(!render(contentOptions).text.includes('expires'));
});

test.each(cases)('%s rejects unsafe, insecure, and off-origin links', (_name, render, options) => {
  for (const actionUrl of unsafeLinks) {
    assert.throws(() => render({ ...options, actionUrl }), templates.EmailTemplateError);
  }
});

test('local HTTP needs explicit opt-in and an exact origin policy', () => {
  const local = {
    ...base,
    actionUrl: 'http://localhost:3100/verify',
    linkPolicy: { allowLocalHttp: true, allowedOrigins: ['http://localhost:3100'] }
  };

  assert.ok(templates.renderVerificationEmail(local).text.includes(local.actionUrl));
  assert.throws(() => templates.renderVerificationEmail({ ...local, linkPolicy: { allowLocalHttp: false } }));
  assert.throws(() =>
    templates.renderVerificationEmail({
      ...local,
      actionUrl: 'http://remote.example/verify',
      linkPolicy: { allowLocalHttp: true }
    })
  );
  assert.throws(() => templates.renderVerificationEmail({ ...base, linkPolicy: { allowedOrigins: [] } }));
  assert.throws(() =>
    templates.renderVerificationEmail({
      ...base,
      linkPolicy: { allowedOrigins: ['https://example.com/path'] }
    })
  );
});

test.each(cases)('%s escapes caller content and rejects header and style injection', (_name, render, options) => {
  const attack = '<img src=x onerror="alert(1)">';
  const mail = render({
    ...options,
    brand: { name: attack, footerText: attack },
    copy: { heading: attack, introduction: attack, actionLabel: attack, securityText: attack }
  });

  assert.ok(!mail.html.includes('<img'));
  assert.ok(mail.html.includes('&lt;img'));
  assert.ok(mail.text.includes(attack));
  assert.throws(() => render({ ...options, subject: 'Hello\r\nBcc: private@example.com' }));
  assert.throws(() => render({ ...options, brand: { name: 'Example', accentColor: 'red;display:none' } }));
});

test('language attributes reject injection', () => {
  assert.throws(() => templates.renderVerificationEmail({ ...base, language: 'en" onclick="x' }));
});

test('official notices preserve paragraphs and preferences without making delivery claims', () => {
  const options = {
    ...base,
    senderName: 'Community',
    title: 'Meeting <details>',
    body: 'First & next.\n\nSecond <script>.\nLast line.',
    preferencesUrl: 'https://example.com/settings'
  };
  const mail = templates.renderOfficialNoticeEmail(options);

  assert.match(mail.html, /Official notice/);
  assert.match(mail.html, /Second &lt;script&gt;.<br>Last line/);
  assert.ok(mail.text.includes(options.body));
  assert.ok(mail.text.includes(options.preferencesUrl));
  assert.ok(!mail.text.includes('legally delivered'));
  assert.throws(() =>
    templates.renderAnnouncementEmail({ ...options, preferencesUrl: 'https://other.example/settings' })
  );

  const notificationOptions = templateCases.find(([name]) => name === 'notification')[2];

  assert.throws(() =>
    templates.renderNotificationEmail({ ...notificationOptions, preferencesUrl: 'javascript:alert(1)' })
  );
});

test.each(cases)('%s allows translated copy and metadata', (_name, render, options) => {
  const mail = render({
    ...options,
    subject: 'Custom subject',
    language: 'fr',
    copy: {
      heading: 'Bonjour',
      introduction: 'Une mise à jour.',
      actionLabel: 'Continuer',
      securityText: 'Texte de sécurité.',
      eyebrow: 'Compte',
      preheader: 'Aperçu',
      fallbackText: 'Copiez ce lien :',
      preferencesLabel: 'Préférences'
    }
  });

  assert.equal(mail.subject, 'Custom subject');
  assert.match(mail.html, /<html lang="fr">/);

  for (const value of ['Bonjour', 'Une mise à jour.', 'Continuer', 'Texte de sécurité.']) {
    assert.ok(mail.text.includes(value));
  }

  assert.ok(mail.html.includes('Aperçu'));
});
