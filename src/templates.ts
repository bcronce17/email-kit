export type EmailBrand = { name: string; accentColor?: string };
export type ActionEmailOptions = {
  brand: EmailBrand;
  actionUrl: string;
  subject: string;
  heading: string;
  introduction: string;
  actionLabel: string;
  expirationText: string;
  securityText: string;
};
export type AccountEmailOptions = Pick<ActionEmailOptions, 'brand' | 'actionUrl' | 'expirationText'>;
export type RenderedEmail = { subject: string; text: string; html: string };

function escape(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

/** Pure rendering: callers own token creation, expiry, link origin, and sending. */
export function renderActionEmail(options: ActionEmailOptions): RenderedEmail {
  const fields = [options.brand.name, options.subject, options.heading, options.introduction,
    options.actionLabel, options.expirationText, options.securityText];
  if (fields.some(value => typeof value !== 'string' || !value.trim())) throw new Error('Email copy must contain text');
  if (/[\r\n\0]/.test(options.subject)) throw new Error('Invalid email subject');
  const url = new URL(options.actionUrl);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Action URL must be HTTP(S) without credentials');
  const color = options.brand.accentColor ?? '#2563eb';
  if (!/^#[a-f\d]{6}$/i.test(color)) throw new Error('Accent color must be a six-digit hex color');
  const [brand, heading, introduction, label, expiration, security] = [options.brand.name, options.heading,
    options.introduction, options.actionLabel, options.expirationText, options.securityText].map(escape);
  const link = escape(url.toString());
  const text = `${options.brand.name}\n\n${options.heading}\n\n${options.introduction}\n\n${options.actionLabel}: ${url.toString()}\n\n${options.expirationText}\n\n${options.securityText}`;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(options.subject)}</title></head>
<body style="margin:0;padding:0;background-color:#f3f5f8;color:#172033;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${introduction} ${expiration}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f5f8;"><tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 8px 24px;font-size:24px;font-weight:bold;letter-spacing:-0.5px;">${brand}</td></tr>
<tr><td style="background-color:#ffffff;border:1px solid #e2e8f0;border-top:4px solid ${color};border-radius:12px;padding:32px 24px;">
<h1 style="margin:0 0 16px;font-size:28px;line-height:1.25;letter-spacing:-0.6px;">${heading}</h1>
<p style="margin:0 0 24px;font-size:16px;line-height:1.65;color:#475569;">${introduction}</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td bgcolor="${color}" style="border-radius:6px;mso-padding-alt:16px 24px;"><a href="${link}" style="display:inline-block;padding:16px 24px;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;border-radius:6px;">${label}</a></td></tr></table>
<p style="margin:20px 0 24px;font-size:14px;line-height:1.6;color:#475569;">${expiration}</p>
<div style="border-top:1px solid #e2e8f0;padding-top:24px;"><p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#64748b;">If the button does not work, copy and paste this link into your browser:</p>
<p style="margin:0;font-size:13px;line-height:1.7;word-break:break-all;overflow-wrap:anywhere;"><a href="${link}" style="color:${color};text-decoration:underline;">${link}</a></p></div>
</td></tr>
<tr><td style="padding:20px 8px;font-size:12px;line-height:1.7;color:#64748b;">${security}</td></tr>
</table></td></tr></table></body></html>`;
  return { subject: options.subject, text, html };
}

export function renderVerificationEmail(options: AccountEmailOptions): RenderedEmail {
  return renderActionEmail({ ...options, subject: 'Verify your email address', heading: 'Verify your email address',
    introduction: `Welcome to ${options.brand.name}. Confirm your email address to finish setting up your account.`,
    actionLabel: 'Verify Email Address', securityText: `If you did not create a ${options.brand.name} account, you can safely ignore this email.` });
}

export function renderPasswordResetEmail(options: AccountEmailOptions): RenderedEmail {
  return renderActionEmail({ ...options, subject: 'Reset your password', heading: 'Reset your password',
    introduction: `We received a request to reset your ${options.brand.name} password. Use the button below to choose a new password.`,
    actionLabel: 'Reset Password', securityText: 'If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.' });
}
