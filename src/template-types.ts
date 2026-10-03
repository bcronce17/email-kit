/** Optional, framework-independent email rendering. Apps own identity and authorization. */
export type EmailBrand = {
  name: string;
  accentColor?: string;
  tagline?: string;
  footerText?: string;
};

export type EmailLinkPolicy = {
  /** Exact permitted origins, applied to every action and preferences link. */
  allowedOrigins?: readonly string[];
  /** Explicit development opt-in; only localhost, 127.0.0.1, and ::1 may use HTTP. */
  allowLocalHttp?: boolean;
};

export type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
};

export type EmailCopy = {
  heading?: string;
  introduction?: string;
  actionLabel?: string;
  securityText?: string;
  eyebrow?: string;
  preheader?: string;
  fallbackText?: string;
  preferencesLabel?: string;
};

export type BaseEmailOptions = {
  brand: EmailBrand;
  linkPolicy?: EmailLinkPolicy;
  copy?: EmailCopy;
  /** HTML language tag. Supply matching translated copy; no automatic translation. */
  language?: string;
};

export type ActionEmailOptions = BaseEmailOptions & {
  actionUrl: string;
  subject: string;
  heading: string;
  introduction: string;
  actionLabel: string;
  expirationText: string;
  securityText: string;
};

export type AccountEmailOptions = BaseEmailOptions & {
  actionUrl: string;
  expirationText: string;
  subject?: string;
};

export type InvitationEmailOptions = AccountEmailOptions & {
  resourceName: string;
  inviterName?: string;
};

export type OrganizationInvitationEmailOptions = AccountEmailOptions & {
  organizationName: string;
  inviterName?: string;
};

export type ProjectInvitationEmailOptions = OrganizationInvitationEmailOptions & { projectName: string };

export type PortalInvitationEmailOptions = AccountEmailOptions & { communityName: string };

export type AnnouncementEmailOptions = BaseEmailOptions & {
  senderName: string;
  title: string;
  body: string;
  actionUrl: string;
  subject?: string;
  /** Optional application-owned preference route; this does not itself unsubscribe. */
  preferencesUrl?: string;
};

export type NotificationEmailOptions = BaseEmailOptions & {
  subject: string;
  heading: string;
  summary: string;
  actionUrl: string;
  actionLabel?: string;
  context?: string;
  details?: readonly {
    label: string;
    value: string;
  }[];
  preferencesUrl?: string;
};

export type EmailLayoutOptions = BaseEmailOptions & {
  subject: string;
  eyebrow: string;
  heading: string;
  introduction: string;
  actionUrl: string;
  actionLabel: string;
  securityText: string;
  expirationText?: string;
  context?: string;
  details?: readonly {
    label: string;
    value: string;
  }[];
  body?: string;
  preferencesUrl?: string;
};
