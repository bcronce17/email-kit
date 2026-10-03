export class EmailConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailConfigurationError';
  }
}

export class EmailMessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailMessageError';
  }
}

/** Sanitized SMTP failure. No original body, address, credential, or raw response. */
export class EmailSendError extends Error {
  readonly code: string;
  readonly responseCode: number | undefined;
  readonly outcome: 'rejected' | 'uncertain';

  constructor(error: unknown) {
    super('Email transport failed');
    this.name = 'EmailSendError';

    const source = error && typeof error === 'object' ? (error as Record<string, unknown>) : {};

    this.code =
      typeof source.code === 'string' && /^[A-Z_0-9]{1,40}$/.test(source.code) ? source.code : 'EMAIL_TRANSPORT_ERROR';

    const responseCode = source.responseCode;
    const response = typeof responseCode === 'number' || typeof responseCode === 'string' ? Number(responseCode) : NaN;

    this.responseCode = Number.isInteger(response) && response >= 400 && response <= 599 ? response : undefined;
    this.outcome = this.responseCode === undefined ? 'uncertain' : 'rejected';
  }
}
