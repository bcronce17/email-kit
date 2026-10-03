import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import * as templates from '../dist/templates.js';
import { renderPreviewGallery } from './preview-gallery.mjs';

const outputDirectory = resolve(process.argv[2] ?? '.previews');

await mkdir(outputDirectory, { recursive: true });

const brands = {
  Waiger: { name: 'wAIger', accentColor: '#abd03f', tagline: 'Make your next pick count.' },
  Keystone: { name: 'Keystone', accentColor: '#245c45', tagline: 'Your project. Everyone on the same page.' },
  Gather: { name: 'Gather', accentColor: '#425bc2', tagline: 'A place for your community.' }
};
const account = {
  actionUrl: 'https://app.example.test/verify?token=preview-not-a-valid-token',
  expirationText: 'This verification link will expire in 24 hours.',
  linkPolicy: { allowedOrigins: ['https://app.example.test'] }
};
const previews = [];

function addPreview(id, label, renderer, options) {
  previews.push({ id, label, ...renderer(options) });
}

for (const [name, brand] of Object.entries(brands)) {
  addPreview(`${name.toLowerCase()}-verification`, `${name}: email verification`, templates.renderVerificationEmail, {
    ...account,
    brand
  });
  addPreview(`${name.toLowerCase()}-password-reset`, `${name}: password reset`, templates.renderPasswordResetEmail, {
    ...account,
    brand,
    actionUrl: 'https://app.example.test/reset-password?token=preview-not-a-valid-token',
    expirationText: 'This password reset link will expire in 1 hour.'
  });
}

const invitation = {
  ...account,
  brand: brands.Keystone,
  actionUrl: 'https://app.example.test/invitation?token=preview-not-a-valid-token',
  expirationText: 'This invitation expires on October 12, 2026 at 5:00 PM UTC.'
};

addPreview('organization-invitation', 'Keystone: company invitation', templates.renderOrganizationInvitationEmail, {
  ...invitation,
  organizationName: 'Northline Builders',
  inviterName: 'Alex Morgan'
});
addPreview('project-invitation', 'Keystone: project invitation', templates.renderProjectInvitationEmail, {
  ...invitation,
  organizationName: 'Northline Builders',
  projectName: 'The Maple Street renovation'
});
addPreview('portal-invitation', 'Gather: resident portal invitation', templates.renderPortalInvitationEmail, {
  ...invitation,
  brand: brands.Gather,
  communityName: 'Willow Creek'
});
addPreview('generic-invitation', 'Any app: invitation', templates.renderInvitationEmail, {
  ...invitation,
  brand: { name: 'Example', accentColor: '#7c3aed' },
  resourceName: 'Design Collective',
  inviterName: 'Jordan'
});

const announcement = {
  brand: brands.Gather,
  senderName: 'Willow Creek',
  title: 'A little care for our shared spaces',
  body: 'Our fall landscaping visit is scheduled for Saturday morning. The team will refresh the planting beds along the main walkway and tidy the community garden.\n\nPlease keep the marked spaces clear between 8:00 AM and noon. The walking path will remain open.\n\nThank you for helping keep Willow Creek welcoming for everyone.',
  actionUrl: 'https://app.example.test/announcements/fall-landscaping',
  preferencesUrl: 'https://app.example.test/profile/email',
  linkPolicy: account.linkPolicy
};

addPreview('announcement', 'Gather: community announcement', templates.renderAnnouncementEmail, announcement);
addPreview('official-notice', 'Gather: official notice', templates.renderOfficialNoticeEmail, {
  ...announcement,
  title: 'October board meeting',
  body: 'The board will meet on October 15 at 6:30 PM in the community room.\n\nThe agenda includes shared-space maintenance, the winter schedule, and resident questions. Sign in to review the complete announcement and available materials.'
});

const events = [
  ['assigned', 'A new task for you', 'You have been assigned a task. Review the details before getting started.'],
  [
    'submitted',
    'Work is ready for review',
    'A task has been submitted. Open it to review the work and supporting evidence.'
  ],
  [
    'changes-requested',
    'Changes have been requested',
    'Your project manager has requested changes. Review the feedback before continuing.'
  ],
  [
    'approved',
    'Your work has been approved',
    'Your project manager approved this task. Open it to see the latest details.'
  ],
  [
    'help-requested',
    'Your team needs a hand',
    'Help has been requested on a task. Review the question and respond in the project.'
  ],
  [
    'declined',
    'A task needs reassignment',
    'The assigned person declined this task. Open the project to review the next step.'
  ]
];

for (const [kind, heading, summary] of events) {
  addPreview(`task-${kind}`, `Keystone: task ${kind}`, templates.renderNotificationEmail, {
    brand: brands.Keystone,
    subject: heading,
    heading,
    summary,
    context: 'Northline Builders · Maple Street renovation',
    details: [
      { label: 'Task', value: 'Choose the kitchen cabinet finish' },
      { label: 'Project', value: 'Maple Street renovation' }
    ],
    actionUrl: `https://app.example.test/projects/maple/tasks/cabinet-finish`,
    actionLabel: 'View Task',
    linkPolicy: account.linkPolicy
  });
}

addPreview('custom-action', 'Any app: custom action', templates.renderActionEmail, {
  ...account,
  brand: { name: 'Example', accentColor: '#c2410c' },
  subject: 'Review your request',
  heading: 'One more step',
  introduction: 'Review the details of your request and confirm when you are ready.',
  actionLabel: 'Review Request',
  expirationText: 'This link expires in 30 minutes.',
  securityText: 'If you did not make this request, you can ignore this email.'
});
addPreview('long-content', 'Layout check: long content and URL', templates.renderProjectInvitationEmail, {
  ...invitation,
  organizationName: 'Northline Residential Construction and Renovation Company',
  projectName: 'The unusually long project name for a complete kitchen and first-floor renovation',
  actionUrl: `https://app.example.test/invitation?token=${'preview-only-'.repeat(35)}`
});

for (const preview of previews) {
  await writeFile(join(outputDirectory, preview.id + '.html'), preview.html);
  await writeFile(join(outputDirectory, preview.id + '.txt'), `Subject: ${preview.subject}\n\n${preview.text}\n`);
}

await writeFile(
  join(outputDirectory, 'manifest.json'),
  JSON.stringify(
    previews.map(({ id, label, subject }) => ({ id, label, subject })),
    null,
    2
  )
);
await writeFile(join(outputDirectory, 'index.html'), renderPreviewGallery(previews));

console.log(`Generated ${previews.length} synthetic previews: ${join(outputDirectory, 'index.html')}`);
