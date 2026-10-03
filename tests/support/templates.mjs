export const base = {
  brand: { name: 'Example & Co', accentColor: '#abd03f' },
  actionUrl: 'https://example.com/action?token=abc&next=home',
  expirationText: 'This link expires in 24 hours.',
  linkPolicy: { allowedOrigins: ['https://example.com'] }
};

export const templateCases = [
  ['verification', 'renderVerificationEmail', base],
  ['password reset', 'renderPasswordResetEmail', base],
  ['invitation', 'renderInvitationEmail', { ...base, resourceName: 'The team' }],
  ['organization', 'renderOrganizationInvitationEmail', { ...base, organizationName: 'Builder & Sons' }],
  [
    'project',
    'renderProjectInvitationEmail',
    { ...base, organizationName: 'Builder & Sons', projectName: 'Kitchen renovation' }
  ],
  ['portal', 'renderPortalInvitationEmail', { ...base, communityName: 'Willow Creek' }],
  [
    'announcement',
    'renderAnnouncementEmail',
    {
      ...base,
      senderName: 'Willow Creek',
      title: 'An update',
      body: 'First paragraph.\n\nSecond paragraph.\nSecond line.'
    }
  ],
  [
    'official notice',
    'renderOfficialNoticeEmail',
    { ...base, senderName: 'Willow Creek', title: 'Board meeting', body: 'Please review the details.' }
  ],
  [
    'notification',
    'renderNotificationEmail',
    {
      ...base,
      subject: 'Task assigned',
      heading: 'A task for you',
      summary: 'Review this task.',
      details: [{ label: 'Project', value: 'Kitchen' }]
    }
  ],
  [
    'action',
    'renderActionEmail',
    {
      ...base,
      subject: 'Review',
      heading: 'Review request',
      introduction: 'Please review.',
      actionLabel: 'Review',
      securityText: 'Contact the sender if unexpected.'
    }
  ]
];
