import type { EmailLayoutOptions } from './template-types.js';
import { escapeHtml } from './template-validation.js';

type HtmlEmailOptions = {
  options: EmailLayoutOptions;
  language: string;
  action: string;
  preferences: string | undefined;
  button: {
    background: string;
    foreground: string;
  };
  detailRows: string;
  fallbackText: string;
  preferencesLabel: string;
  introductionHtml: string;
  bodyHtml: string;
};

function optionalParagraph(value: string | undefined, style: string): string {
  return value ? `<p style="${style}">${escapeHtml(value)}</p>` : '';
}

export function renderHtmlEmail({
  options,
  language,
  action,
  preferences,
  button,
  detailRows,
  fallbackText,
  preferencesLabel,
  introductionHtml,
  bodyHtml
}: HtmlEmailOptions): string {
  const { brand } = options;
  const preheader = (options.copy?.preheader ?? options.introduction).slice(0, 180);
  const taglineHtml = optionalParagraph(brand.tagline, 'margin:6px 0 0;font-size:12px;line-height:1.6;color:#64748b;');
  const contextHtml = optionalParagraph(
    options.context,
    'margin:0 0 20px;font-size:13px;line-height:1.6;color:#64748b;'
  );
  const expiryHtml = optionalParagraph(
    options.expirationText,
    'margin:18px 0 0;font-size:13px;line-height:1.6;color:#475569;'
  );
  const footerHtml = optionalParagraph(brand.footerText, 'margin:0;');

  const detailsHtml = detailRows
    ? `<table width="100%" cellspacing="0" cellpadding="0" border="0"
        style="margin:4px 0 24px;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;table-layout:fixed;">
        ${detailRows}
      </table>`
    : '';

  const preferencesHtml = preferences
    ? `<p style="margin:0 0 10px;">
        <a href="${escapeHtml(preferences)}" style="color:#475569;text-decoration:underline;">${escapeHtml(preferencesLabel)}</a>
      </p>`
    : '';

  return `<!doctype html>
<html lang="${language}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${escapeHtml(options.subject)}</title>
  </head>

  <body style="margin:0;padding:0;background-color:#f3f5f8;color:#172033;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f5f8;">
      <tr>
        <td align="center" style="padding:36px 16px;">
          <!--[if mso]><table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
            style="max-width:560px;table-layout:fixed;word-wrap:break-word;">
            <tr>
              <td style="padding:0 8px 24px;">
                <p style="margin:0;font-size:24px;font-weight:bold;letter-spacing:-0.5px;color:#172033;">${escapeHtml(brand.name)}</p>
                ${taglineHtml}
              </td>
            </tr>

            <tr>
              <td style="background-color:#ffffff;border:1px solid #e2e8f0;border-top:4px solid ${button.background};border-radius:12px;padding:30px 24px;">
                <p style="margin:0 0 14px;font-size:11px;font-weight:bold;letter-spacing:1.7px;color:#64748b;text-transform:uppercase;">${escapeHtml(options.eyebrow)}</p>
                <h1 style="margin:0 0 16px;font-size:28px;line-height:1.25;letter-spacing:-0.6px;color:#172033;">${escapeHtml(options.heading)}</h1>

                ${contextHtml}
                ${introductionHtml}${bodyHtml}
                ${detailsHtml}

                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:26px 0 0;max-width:100%;">
                  <tr>
                    <td bgcolor="${button.background}" style="border-radius:6px;mso-padding-alt:16px 24px;">
                      <a href="${escapeHtml(action)}"
                        style="display:inline-block;padding:16px 24px;color:${button.foreground};font-size:16px;line-height:1.4;font-weight:bold;text-decoration:none;border-radius:6px;">${escapeHtml(options.actionLabel)}</a>
                    </td>
                  </tr>
                </table>

                ${expiryHtml}

                <div style="margin-top:26px;border-top:1px solid #e2e8f0;padding-top:22px;">
                  <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#64748b;">${escapeHtml(fallbackText)}</p>
                  <p style="margin:0;font-size:12px;line-height:1.7;word-break:break-all;overflow-wrap:anywhere;">
                    <a href="${escapeHtml(action)}" style="color:#334155;text-decoration:underline;">${escapeHtml(action)}</a>
                  </p>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 8px;font-size:12px;line-height:1.7;color:#64748b;">
                <p style="margin:0 0 10px;">${escapeHtml(options.securityText)}</p>
                ${preferencesHtml}
                ${footerHtml}
              </td>
            </tr>
          </table>
          <!--[if mso]></td></tr></table><![endif]-->
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
