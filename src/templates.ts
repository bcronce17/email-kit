import type {
  RenderedEmail,
  ActionEmailOptions,
  AccountEmailOptions,
  InvitationEmailOptions,
  OrganizationInvitationEmailOptions,
  ProjectInvitationEmailOptions,
  PortalInvitationEmailOptions,
  AnnouncementEmailOptions,
  NotificationEmailOptions
} from './template-types.js';
import { requireText, validateOptionalText } from './template-validation.js';
import { renderEmailLayout } from './template-layout.js';

export type {
  EmailBrand,
  EmailLinkPolicy,
  RenderedEmail,
  EmailCopy,
  BaseEmailOptions,
  ActionEmailOptions,
  AccountEmailOptions,
  InvitationEmailOptions,
  OrganizationInvitationEmailOptions,
  ProjectInvitationEmailOptions,
  PortalInvitationEmailOptions,
  AnnouncementEmailOptions,
  NotificationEmailOptions
} from './template-types.js';

export { EmailTemplateError } from './template-validation.js';

/** Callers supply truthful expiry wording. Rendering never creates or checks tokens. */
export function renderActionEmail(options: ActionEmailOptions): RenderedEmail {
  requireText(options.expirationText, 'Expiry text');

  return renderEmailLayout({ ...options, eyebrow: 'Action required' });
}

export function renderVerificationEmail(options: AccountEmailOptions): RenderedEmail {
  return renderActionEmail({
    ...options,
    subject: options.subject ?? 'Verify your email address',
    heading: 'Verify your email address',
    introduction: `Welcome to ${options.brand.name}. Confirm your email address to finish setting up your account.`,
    actionLabel: 'Verify Email Address',
    securityText: `If you did not create a ${options.brand.name} account, you can safely ignore this email.`
  });
}

export function renderPasswordResetEmail(options: AccountEmailOptions): RenderedEmail {
  return renderActionEmail({
    ...options,
    subject: options.subject ?? 'Reset your password',
    heading: 'Reset your password',
    introduction: `We received a request to reset your ${options.brand.name} password. Use the button below to choose a new password.`,
    actionLabel: 'Reset Password',
    securityText:
      'If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.'
  });
}

function renderInvitationLayout(
  options: AccountEmailOptions,
  content: {
    subject: string;
    heading: string;
    introduction: string;
    context: string;
    actionLabel: string;
  }
) {
  requireText(options.expirationText, 'Expiry text');

  return renderEmailLayout({
    ...options,
    ...content,
    subject: options.subject ?? content.subject,
    eyebrow: 'Invitation',
    securityText:
      'If you do not recognize this invitation, do not use the link. Contact the sender through a trusted channel.'
  });
}

export function renderInvitationEmail(options: InvitationEmailOptions): RenderedEmail {
  requireText(options.resourceName, 'Invitation name');
  validateOptionalText(options.inviterName, 'Inviter name');

  return renderInvitationLayout(options, {
    subject: `Invitation to ${options.resourceName}`,
    heading: "You're invited",
    introduction: `${options.inviterName ?? options.resourceName} has invited you to ${options.resourceName}. Open the invitation to review the details and continue.`,
    context: options.resourceName,
    actionLabel: 'View Invitation'
  });
}

export function renderOrganizationInvitationEmail(options: OrganizationInvitationEmailOptions): RenderedEmail {
  requireText(options.organizationName, 'Organization name');
  validateOptionalText(options.inviterName, 'Inviter name');

  return renderInvitationLayout(options, {
    subject: `Join ${options.organizationName} on ${options.brand.name}`,
    heading: 'Join your team',
    introduction: `${options.inviterName ?? options.organizationName} has invited you to join ${options.organizationName} on ${options.brand.name}. Review the invitation to get started.`,
    context: options.organizationName,
    actionLabel: 'View Team Invitation'
  });
}

export function renderProjectInvitationEmail(options: ProjectInvitationEmailOptions): RenderedEmail {
  requireText(options.organizationName, 'Organization name');
  requireText(options.projectName, 'Project name');
  validateOptionalText(options.inviterName, 'Inviter name');

  return renderInvitationLayout(options, {
    subject: `Invitation to ${options.projectName}`,
    heading: 'Your project invitation',
    introduction: `${options.inviterName ?? options.organizationName} has invited you to ${options.projectName}. Open the invitation to review your access and continue.`,
    context: `${options.organizationName} · ${options.projectName}`,
    actionLabel: 'View Project Invitation'
  });
}

export function renderPortalInvitationEmail(options: PortalInvitationEmailOptions): RenderedEmail {
  requireText(options.communityName, 'Community name');

  return renderInvitationLayout(options, {
    subject: `Invitation to the ${options.communityName} resident portal`,
    heading: 'Connect with your community',
    introduction: `${options.communityName} has invited you to its resident portal on ${options.brand.name}. Review your invitation to get started.`,
    context: options.communityName,
    actionLabel: 'Open Your Invitation'
  });
}

function renderAnnouncementLayout(options: AnnouncementEmailOptions, official: boolean) {
  requireText(options.senderName, 'Sender name');
  requireText(options.title, 'Announcement title');
  requireText(options.body, 'Announcement body');

  const kind = official ? 'Official notice' : 'Community announcement';

  return renderEmailLayout({
    ...options,
    subject: options.subject ?? `${kind} from ${options.senderName}: ${options.title}`,
    eyebrow: kind,
    heading: options.title,
    introduction: `An update from ${options.senderName}.`,
    context: options.senderName,
    actionLabel: 'Read in the Portal',
    securityText:
      'Sign in to view this announcement. If it is no longer available to you, contact your administrator through a trusted channel.'
  });
}

export function renderAnnouncementEmail(options: AnnouncementEmailOptions): RenderedEmail {
  return renderAnnouncementLayout(options, false);
}

/** Classification only; this renderer makes no claim about legally sufficient delivery. */
export function renderOfficialNoticeEmail(options: AnnouncementEmailOptions): RenderedEmail {
  return renderAnnouncementLayout(options, true);
}

export function renderNotificationEmail(options: NotificationEmailOptions): RenderedEmail {
  return renderEmailLayout({
    ...options,
    eyebrow: 'Notification',
    introduction: options.summary,
    actionLabel: options.actionLabel ?? 'View Update',
    securityText: 'Sign in to see the latest details. Your current permissions determine what you can access.'
  });
}
