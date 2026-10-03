import type { EmailLayoutOptions, RenderedEmail } from './template-types.js';
import {
  EmailTemplateError,
  requireText,
  validateOptionalText,
  validateSingleLine,
  validateLink,
  getButtonColors,
  escapeHtml
} from './template-validation.js';
import { renderHtmlEmail } from './template-html.js';

function renderParagraphs(value: string) {
  return value
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map(
      (part) =>
        `<p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#475569;">${escapeHtml(part).replace(/\n/g, '<br>')}</p>`
    )
    .join('');
}

export function renderEmailLayout(input: EmailLayoutOptions): RenderedEmail {
  const options = {
    ...input,
    heading: input.copy?.heading ?? input.heading,
    introduction: input.copy?.introduction ?? input.introduction,
    actionLabel: input.copy?.actionLabel ?? input.actionLabel,
    securityText: input.copy?.securityText ?? input.securityText,
    eyebrow: input.copy?.eyebrow ?? input.eyebrow
  };

  for (const value of Object.values(input.copy ?? {})) {
    validateOptionalText(value, 'Custom copy');
  }

  const language = input.language ?? 'en';

  if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(language)) {
    throw new EmailTemplateError('Invalid language tag');
  }

  const fallbackText =
    input.copy?.fallbackText ?? 'If the button does not work, copy and paste this link into your browser:';
  const preferencesLabel = input.copy?.preferencesLabel ?? 'Manage email preferences';
  const { brand } = options;

  requireText(brand?.name, 'Brand name');
  validateOptionalText(brand.tagline, 'Brand tagline');
  validateOptionalText(brand.footerText, 'Brand footer');
  validateSingleLine(options.subject, 'Subject');

  for (const [label, value] of Object.entries({
    heading: options.heading,
    introduction: options.introduction,
    actionLabel: options.actionLabel,
    securityText: options.securityText
  })) {
    requireText(value, label);
  }

  validateOptionalText(options.expirationText, 'Expiry text');
  validateOptionalText(options.context, 'Context');
  validateOptionalText(options.body, 'Body');

  const action = validateLink(options.actionUrl, options.linkPolicy);
  const preferences =
    options.preferencesUrl === undefined ? undefined : validateLink(options.preferencesUrl, options.linkPolicy);
  const button = getButtonColors(brand.accentColor ?? '#2563eb');
  const detailRows =
    options.details
      ?.map((detail) => {
        requireText(detail.label, 'Detail label');
        requireText(detail.value, 'Detail value');

        return `<tr>
          <th scope="row" align="left" valign="top" style="padding:8px 16px 8px 0;font-size:13px;font-weight:normal;color:#64748b;">${escapeHtml(detail.label)}</th>
          <td style="padding:8px 0;font-size:14px;color:#172033;">${escapeHtml(detail.value)}</td>
        </tr>`;
      })
      .join('') ?? '';
  const text = [
    brand.name,
    brand.tagline,
    options.eyebrow,
    options.heading,
    options.context,
    options.introduction,
    options.body,
    options.details?.map((detail) => `${detail.label}: ${detail.value}`).join('\n'),
    `${options.actionLabel}: ${action}`,
    options.expirationText,
    options.securityText,
    preferences && `${preferencesLabel}: ${preferences}`,
    brand.footerText
  ]
    .filter(Boolean)
    .join('\n\n');
  const html = renderHtmlEmail({
    options,
    language,
    action,
    preferences,
    button,
    detailRows,
    fallbackText,
    preferencesLabel,
    introductionHtml: renderParagraphs(options.introduction),
    bodyHtml: options.body ? renderParagraphs(options.body) : ''
  });

  return { subject: options.subject, text, html };
}
