/** Optional, framework-independent email rendering. Apps own identity and authorization. */
export type EmailBrand = { name: string; accentColor?: string; tagline?: string; footerText?: string };
export type EmailLinkPolicy = {
  /** Exact permitted origins, applied to every action and preferences link. */
  allowedOrigins?: readonly string[];
  /** Explicit development opt-in; only localhost, 127.0.0.1, and ::1 may use HTTP. */
  allowLocalHttp?: boolean;
};
export type RenderedEmail = { subject: string; text: string; html: string };
export type EmailCopy = {
  heading?: string; introduction?: string; actionLabel?: string; securityText?: string;
  eyebrow?: string; preheader?: string; fallbackText?: string; preferencesLabel?: string;
};
export type BaseEmailOptions = {
  brand: EmailBrand; linkPolicy?: EmailLinkPolicy; copy?: EmailCopy;
  /** HTML language tag. Supply matching translated copy; no automatic translation. */
  language?: string;
};
type BaseOptions = BaseEmailOptions;
export type ActionEmailOptions = BaseOptions & {
  actionUrl: string; subject: string; heading: string; introduction: string;
  actionLabel: string; expirationText: string; securityText: string;
};
export type AccountEmailOptions = BaseOptions & {
  actionUrl: string; expirationText: string; subject?: string;
};
export type InvitationEmailOptions = AccountEmailOptions & { resourceName: string; inviterName?: string };
export type OrganizationInvitationEmailOptions = AccountEmailOptions & { organizationName: string; inviterName?: string };
export type ProjectInvitationEmailOptions = OrganizationInvitationEmailOptions & { projectName: string };
export type PortalInvitationEmailOptions = AccountEmailOptions & { communityName: string };
export type AnnouncementEmailOptions = BaseOptions & {
  senderName: string; title: string; body: string; actionUrl: string; subject?: string;
  /** Optional application-owned preference route; this does not itself unsubscribe. */
  preferencesUrl?: string;
};
export type NotificationEmailOptions = BaseOptions & {
  subject: string; heading: string; summary: string; actionUrl: string;
  actionLabel?: string; context?: string; details?: readonly { label: string; value: string }[];
  preferencesUrl?: string;
};

export class EmailTemplateError extends Error {
  constructor(message: string) { super(message); this.name = 'EmailTemplateError'; }
}
function required(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || /\0/.test(value))
    throw new EmailTemplateError(`${label} must contain text`);
}
function optional(value: unknown, label: string) { if (value !== undefined) required(value, label); }
function escape(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
function singleLine(value: string, label: string) {
  required(value, label);
  if (/[\r\n]/.test(value)) throw new EmailTemplateError(`${label} must be a single line`);
  return value;
}
function validatedUrl(value: string, policy?: EmailLinkPolicy) {
  let url: URL;
  try {
    if (typeof value !== 'string' || value !== value.trim() || /[\s\x00-\x1f\x7f\\]/.test(value)) throw new Error();
    url = new URL(value);
  } catch { throw new EmailTemplateError('Invalid email link'); }
  const localHttp = policy?.allowLocalHttp === true && url.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !localHttp) || url.username || url.password)
    throw new EmailTemplateError('Email links require HTTPS; local HTTP requires explicit opt-in');
  if (policy?.allowedOrigins !== undefined) {
    if (!Array.isArray(policy.allowedOrigins) || policy.allowedOrigins.length === 0)
      throw new EmailTemplateError('Allowed origins must be a nonempty list');
    const origins = policy.allowedOrigins.map(origin => {
      try {
        const parsed = new URL(origin);
        if (parsed.origin !== origin || !['http:', 'https:'].includes(parsed.protocol)) throw new Error();
        return parsed.origin;
      } catch { throw new EmailTemplateError('Allowed origins must be exact HTTP(S) origins'); }
    });
    if (!origins.includes(url.origin)) throw new EmailTemplateError('Email link is outside allowed origins');
  }
  return url.toString();
}
function colors(value: string) {
  if (!/^#[a-f\d]{6}$/i.test(value)) throw new EmailTemplateError('Accent color must be a six-digit hex color');
  const rgb = [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16) / 255)
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!;
  return { background: value, foreground: luminance > 0.179 ? '#000000' : '#ffffff' };
}
function paragraphs(value: string) {
  return value.replace(/\r\n?/g, '\n').split(/\n\s*\n/).map(part =>
    `<p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#475569;">${escape(part).replace(/\n/g, '<br>')}</p>`).join('');
}

type Layout = BaseOptions & {
  subject: string; eyebrow: string; heading: string; introduction: string;
  actionUrl: string; actionLabel: string; securityText: string;
  expirationText?: string; context?: string; details?: readonly { label: string; value: string }[];
  body?: string; preferencesUrl?: string;
};
function render(input: Layout): RenderedEmail {
  const options = { ...input,
    heading: input.copy?.heading ?? input.heading,
    introduction: input.copy?.introduction ?? input.introduction,
    actionLabel: input.copy?.actionLabel ?? input.actionLabel,
    securityText: input.copy?.securityText ?? input.securityText,
    eyebrow: input.copy?.eyebrow ?? input.eyebrow,
  };
  for (const value of Object.values(input.copy ?? {})) optional(value, 'Custom copy');
  const language = input.language ?? 'en';
  if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(language)) throw new EmailTemplateError('Invalid language tag');
  const fallbackText = input.copy?.fallbackText ?? 'If the button does not work, copy and paste this link into your browser:';
  const preferencesLabel = input.copy?.preferencesLabel ?? 'Manage email preferences';
  const { brand } = options;
  required(brand?.name, 'Brand name');
  optional(brand.tagline, 'Brand tagline'); optional(brand.footerText, 'Brand footer');
  singleLine(options.subject, 'Subject');
  for (const [label, value] of Object.entries({ heading: options.heading, introduction: options.introduction,
    actionLabel: options.actionLabel, securityText: options.securityText })) required(value, label);
  optional(options.expirationText, 'Expiry text'); optional(options.context, 'Context'); optional(options.body, 'Body');
  const action = validatedUrl(options.actionUrl, options.linkPolicy);
  const preferences = options.preferencesUrl === undefined ? undefined : validatedUrl(options.preferencesUrl, options.linkPolicy);
  const button = colors(brand.accentColor ?? '#2563eb');
  const detailRows = options.details?.map(detail => {
    required(detail.label, 'Detail label'); required(detail.value, 'Detail value');
    return `<tr><th scope="row" align="left" valign="top" style="padding:8px 16px 8px 0;font-size:13px;font-weight:normal;color:#64748b;">${escape(detail.label)}</th><td style="padding:8px 0;font-size:14px;color:#172033;">${escape(detail.value)}</td></tr>`;
  }).join('') ?? '';
  const text = [brand.name, brand.tagline, options.eyebrow, options.heading, options.context,
    options.introduction, options.body, options.details?.map(detail => `${detail.label}: ${detail.value}`).join('\n'),
    `${options.actionLabel}: ${action}`, options.expirationText, options.securityText,
    preferences && `${preferencesLabel}: ${preferences}`, brand.footerText].filter(Boolean).join('\n\n');
  const html = `<!doctype html>
<html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${escape(options.subject)}</title></head>
<body style="margin:0;padding:0;background-color:#f3f5f8;color:#172033;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escape((options.copy?.preheader ?? options.introduction).slice(0, 180))}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f5f8;"><tr><td align="center" style="padding:36px 16px;">
<!--[if mso]><table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;table-layout:fixed;word-wrap:break-word;">
<tr><td style="padding:0 8px 24px;"><p style="margin:0;font-size:24px;font-weight:bold;letter-spacing:-0.5px;color:#172033;">${escape(brand.name)}</p>${brand.tagline ? `<p style="margin:6px 0 0;font-size:12px;line-height:1.6;color:#64748b;">${escape(brand.tagline)}</p>` : ''}</td></tr>
<tr><td style="background-color:#ffffff;border:1px solid #e2e8f0;border-top:4px solid ${button.background};border-radius:12px;padding:30px 24px;">
<p style="margin:0 0 14px;font-size:11px;font-weight:bold;letter-spacing:1.7px;color:#64748b;text-transform:uppercase;">${escape(options.eyebrow)}</p>
<h1 style="margin:0 0 16px;font-size:28px;line-height:1.25;letter-spacing:-0.6px;color:#172033;">${escape(options.heading)}</h1>
${options.context ? `<p style="margin:0 0 20px;font-size:13px;line-height:1.6;color:#64748b;">${escape(options.context)}</p>` : ''}
${paragraphs(options.introduction)}${options.body ? paragraphs(options.body) : ''}
${detailRows ? `<table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:4px 0 24px;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;table-layout:fixed;">${detailRows}</table>` : ''}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:26px 0 0;max-width:100%;"><tr><td bgcolor="${button.background}" style="border-radius:6px;mso-padding-alt:16px 24px;"><a href="${escape(action)}" style="display:inline-block;padding:16px 24px;color:${button.foreground};font-size:16px;line-height:1.4;font-weight:bold;text-decoration:none;border-radius:6px;">${escape(options.actionLabel)}</a></td></tr></table>
${options.expirationText ? `<p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#475569;">${escape(options.expirationText)}</p>` : ''}
<div style="margin-top:26px;border-top:1px solid #e2e8f0;padding-top:22px;"><p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#64748b;">${escape(fallbackText)}</p>
<p style="margin:0;font-size:12px;line-height:1.7;word-break:break-all;overflow-wrap:anywhere;"><a href="${escape(action)}" style="color:#334155;text-decoration:underline;">${escape(action)}</a></p></div>
</td></tr>
<tr><td style="padding:20px 8px;font-size:12px;line-height:1.7;color:#64748b;"><p style="margin:0 0 10px;">${escape(options.securityText)}</p>${preferences ? `<p style="margin:0 0 10px;"><a href="${escape(preferences)}" style="color:#475569;text-decoration:underline;">${escape(preferencesLabel)}</a></p>` : ''}${brand.footerText ? `<p style="margin:0;">${escape(brand.footerText)}</p>` : ''}</td></tr>
</table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>`;
  return { subject: options.subject, text, html };
}

/** Callers supply truthful expiry wording. Rendering never creates or checks tokens. */
export function renderActionEmail(options: ActionEmailOptions): RenderedEmail {
  required(options.expirationText, 'Expiry text');
  return render({ ...options, eyebrow: 'Action required' });
}
export function renderVerificationEmail(options: AccountEmailOptions): RenderedEmail {
  return renderActionEmail({ ...options, subject: options.subject ?? 'Verify your email address', heading: 'Verify your email address',
    introduction: `Welcome to ${options.brand.name}. Confirm your email address to finish setting up your account.`,
    actionLabel: 'Verify Email Address', securityText: `If you did not create a ${options.brand.name} account, you can safely ignore this email.` });
}
export function renderPasswordResetEmail(options: AccountEmailOptions): RenderedEmail {
  return renderActionEmail({ ...options, subject: options.subject ?? 'Reset your password', heading: 'Reset your password',
    introduction: `We received a request to reset your ${options.brand.name} password. Use the button below to choose a new password.`,
    actionLabel: 'Reset Password', securityText: 'If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.' });
}
function invitation(options: AccountEmailOptions, content: { subject: string; heading: string; introduction: string; context: string; actionLabel: string }) {
  required(options.expirationText, 'Expiry text');
  return render({ ...options, ...content, subject: options.subject ?? content.subject, eyebrow: 'Invitation',
    securityText: 'If you do not recognize this invitation, do not use the link. Contact the sender through a trusted channel.' });
}
export function renderInvitationEmail(options: InvitationEmailOptions): RenderedEmail {
  required(options.resourceName, 'Invitation name'); optional(options.inviterName, 'Inviter name');
  return invitation(options, { subject: `Invitation to ${options.resourceName}`, heading: "You're invited",
    introduction: `${options.inviterName ?? options.resourceName} has invited you to ${options.resourceName}. Open the invitation to review the details and continue.`,
    context: options.resourceName, actionLabel: 'View Invitation' });
}
export function renderOrganizationInvitationEmail(options: OrganizationInvitationEmailOptions): RenderedEmail {
  required(options.organizationName, 'Organization name'); optional(options.inviterName, 'Inviter name');
  return invitation(options, { subject: `Join ${options.organizationName} on ${options.brand.name}`, heading: 'Join your team',
    introduction: `${options.inviterName ?? options.organizationName} has invited you to join ${options.organizationName} on ${options.brand.name}. Review the invitation to get started.`,
    context: options.organizationName, actionLabel: 'View Team Invitation' });
}
export function renderProjectInvitationEmail(options: ProjectInvitationEmailOptions): RenderedEmail {
  required(options.organizationName, 'Organization name'); required(options.projectName, 'Project name'); optional(options.inviterName, 'Inviter name');
  return invitation(options, { subject: `Invitation to ${options.projectName}`, heading: 'Your project invitation',
    introduction: `${options.inviterName ?? options.organizationName} has invited you to ${options.projectName}. Open the invitation to review your access and continue.`,
    context: `${options.organizationName} · ${options.projectName}`, actionLabel: 'View Project Invitation' });
}
export function renderPortalInvitationEmail(options: PortalInvitationEmailOptions): RenderedEmail {
  required(options.communityName, 'Community name');
  return invitation(options, { subject: `Invitation to the ${options.communityName} resident portal`, heading: 'Connect with your community',
    introduction: `${options.communityName} has invited you to its resident portal on ${options.brand.name}. Review your invitation to get started.`,
    context: options.communityName, actionLabel: 'Open Your Invitation' });
}
function announcement(options: AnnouncementEmailOptions, official: boolean) {
  required(options.senderName, 'Sender name'); required(options.title, 'Announcement title'); required(options.body, 'Announcement body');
  const kind = official ? 'Official notice' : 'Community announcement';
  return render({ ...options, subject: options.subject ?? `${kind} from ${options.senderName}: ${options.title}`,
    eyebrow: kind, heading: options.title, introduction: `An update from ${options.senderName}.`, context: options.senderName,
    actionLabel: 'Read in the Portal', securityText: 'Sign in to view this announcement. If it is no longer available to you, contact your administrator through a trusted channel.' });
}
export function renderAnnouncementEmail(options: AnnouncementEmailOptions): RenderedEmail { return announcement(options, false); }
/** Classification only; this renderer makes no claim about legally sufficient delivery. */
export function renderOfficialNoticeEmail(options: AnnouncementEmailOptions): RenderedEmail { return announcement(options, true); }
export function renderNotificationEmail(options: NotificationEmailOptions): RenderedEmail {
  return render({ ...options, eyebrow: 'Notification', introduction: options.summary, actionLabel: options.actionLabel ?? 'View Update',
    securityText: 'Sign in to see the latest details. Your current permissions determine what you can access.' });
}
