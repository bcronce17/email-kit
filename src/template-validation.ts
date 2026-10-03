import type { EmailLinkPolicy } from './template-types.js';

export class EmailTemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailTemplateError';
  }
}

export function requireText(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || /\0/.test(value)) {
    throw new EmailTemplateError(`${label} must contain text`);
  }
}

export function validateOptionalText(value: unknown, label: string) {
  if (value !== undefined) {
    requireText(value, label);
  }
}

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!
  );
}

export function validateSingleLine(value: string, label: string) {
  requireText(value, label);

  if (/[\r\n]/.test(value)) {
    throw new EmailTemplateError(`${label} must be a single line`);
  }

  return value;
}

export function validateLink(value: string, policy?: EmailLinkPolicy) {
  let url: URL;

  try {
    // eslint-disable-next-line no-control-regex -- Email links must reject ASCII control characters.
    if (typeof value !== 'string' || value !== value.trim() || /[\s\x00-\x1f\x7f\\]/.test(value)) {
      throw new Error();
    }

    url = new URL(value);
  } catch {
    throw new EmailTemplateError('Invalid email link');
  }

  const localHttp =
    policy?.allowLocalHttp === true &&
    url.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);

  if ((url.protocol !== 'https:' && !localHttp) || url.username || url.password) {
    throw new EmailTemplateError('Email links require HTTPS; local HTTP requires explicit opt-in');
  }

  if (policy?.allowedOrigins !== undefined) {
    if (!Array.isArray(policy.allowedOrigins) || policy.allowedOrigins.length === 0) {
      throw new EmailTemplateError('Allowed origins must be a nonempty list');
    }

    const origins = policy.allowedOrigins.map((origin) => {
      try {
        const parsed = new URL(origin);

        if (parsed.origin !== origin || !['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error();
        }

        return parsed.origin;
      } catch {
        throw new EmailTemplateError('Allowed origins must be exact HTTP(S) origins');
      }
    });

    if (!origins.includes(url.origin)) {
      throw new EmailTemplateError('Email link is outside allowed origins');
    }
  }

  return url.toString();
}

export function getButtonColors(value: string) {
  if (!/^#[a-f\d]{6}$/i.test(value)) {
    throw new EmailTemplateError('Accent color must be a six-digit hex color');
  }

  const rgb = [1, 3, 5]
    .map((i) => parseInt(value.slice(i, i + 2), 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  const luminance = 0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!;

  return { background: value, foreground: luminance > 0.179 ? '#000000' : '#ffffff' };
}
