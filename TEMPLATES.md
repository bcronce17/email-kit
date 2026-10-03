# Email templates

Available from version 0.2.0 through `@brim-software/email-kit/templates`. Version 0.1.0 provides the transport only.

Each renderer returns `{ subject, text, html }`. Render independently of the email transport, then pass the result to `client.send({ to, ...message })`. No framework, database, filesystem, environment variable, or network access is required to render.

## Template catalog

| Renderer                            | Purpose                                         | Required content beyond brand and action URL                                                    |
| ----------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `renderVerificationEmail`           | Account email verification and resend           | `expirationText`                                                                                |
| `renderPasswordResetEmail`          | Requested password recovery                     | `expirationText`                                                                                |
| `renderInvitationEmail`             | Generic invitation                              | `resourceName`, `expirationText`; optional `inviterName`                                        |
| `renderOrganizationInvitationEmail` | Company/team membership invitation              | `organizationName`, `expirationText`; optional `inviterName`                                    |
| `renderProjectInvitationEmail`      | Project access invitation                       | `organizationName`, `projectName`, `expirationText`; optional `inviterName`                     |
| `renderPortalInvitationEmail`       | Community/resident portal invitation            | `communityName`, `expirationText`                                                               |
| `renderAnnouncementEmail`           | Community content with a protected portal link  | `senderName`, `title`, plain-text `body`; optional `preferencesUrl`                             |
| `renderOfficialNoticeEmail`         | Same layout with official-notice classification | Same as announcement; classification does not establish legal delivery                          |
| `renderNotificationEmail`           | Task/activity updates                           | `subject`, `heading`, `summary`; optional `context`, `details`, `actionLabel`, `preferencesUrl` |
| `renderActionEmail`                 | Custom action message                           | `subject`, `heading`, `introduction`, `actionLabel`, `expirationText`, `securityText`           |

Subjects can be overridden on every renderer. Notifications cover task assignment, submission, changes requested, approval, help requested, and declined tasks through app-supplied wording. Renderers do not infer event recipients or trigger sends.

## Configuration

```ts
import { renderVerificationEmail } from '@brim-software/email-kit/templates';

const message = renderVerificationEmail({
  brand: {
    name: 'Your app',
    accentColor: '#abd03f',
    tagline: 'A useful place to get things done.',
    footerText: 'Sent by Your app.'
  },
  actionUrl: verificationUrl, // Created by the application/auth provider.
  expirationText: 'This verification link will expire in 24 hours.',
  linkPolicy: { allowedOrigins: ['https://app.example.com'] },
  subject: 'Confirm your account',
  copy: {
    heading: 'Welcome aboard',
    introduction: 'Confirm your email to finish setting up your account.',
    actionLabel: 'Confirm Email',
    preheader: 'One quick step to finish setting up your account.'
  }
});
await email.send({ to: recipient, ...message });
```

`brand.name` is required. `accentColor` accepts six-digit hex colors; the button automatically chooses black or white text for contrast. Optional `tagline` and `footerText` are escaped plain text. Images and external fonts are not required for the layout.

`copy` supports `heading`, `introduction`, `actionLabel`, `securityText`, `eyebrow`, `preheader`, `fallbackText`, and `preferencesLabel`. Unspecified values use the template defaults. `language` sets the HTML language tag (default `en`); applications supply translated text. Defaults are English and right-to-left layout is not supported in this release.

Announcements accept plain text with paragraphs and line breaks. Notification `details` is a list of `{ label, value }` entries. No template accepts raw HTML, CSS, or executable content. Use custom copy and structured values instead. Layout geometry is deliberately consistent across applications; brand colors and content are configurable.

## Links, expiry, and privacy

HTTPS is required by default for every action and preferences link. Credentials, unsafe URL schemes, control characters, and remote HTTP links are rejected. For local development only, use `linkPolicy: { allowLocalHttp: true, allowedOrigins: ['http://localhost:3100'] }`. The local HTTP option accepts only localhost, 127.0.0.1, and ::1.

Configure `allowedOrigins` from trusted application settings, never from request input. It applies to every rendered link. Without it, any HTTPS origin is accepted; the application is responsible for approving the destination. Exact origins include the port and have no path or trailing slash. Add a separate approved origin when preferences live elsewhere.

`expirationText` is required for token-based templates. The application must generate secure tokens, enforce real expiry and single use, validate the account and intended action, rate-limit requests, and avoid logging token URLs. Prefer expiry wording based on the token's actual deadline if delivery may be delayed. Rendering neither validates the token nor changes its lifetime. Ordinary announcement and notification links rely on current authenticated authorization and need no invented expiry.

All content passed to a template may be visible outside the application in an inbox. Supply only content approved for that recipient. A preferences link is a navigation link, not an automatic unsubscribe endpoint or a `List-Unsubscribe` header. Applications own opt-out enforcement, audience snapshots, official-notice rules, and current-access checks. Opening a link must not silently grant membership or change permissions.

## Preview and client compatibility

```sh
npm run preview:templates
# Open .previews/index.html in a browser.
```

The gallery includes verification/reset examples for three brands, every invitation variant, announcements, official notices, six task-notification examples, a custom action, and a long-content layout check. It uses synthetic URLs and never sends mail. Every example includes separate HTML and plain-text files. Run `node examples/template-previews.mjs /your/output/path` after building to choose an output directory.

Design uses a fluid single-column table layout, a 560px content cap, inline styles, system fonts, large buttons, visible fallback links, and an Outlook conditional width wrapper. Brand names, long URLs, and body text wrap on narrow screens. Borders and corner rounding may degrade gracefully in older clients.

Browser viewport checks cannot establish compatibility with every mail client. Before release, inspect captured test messages in Gmail, Outlook, and Apple Mail, including mobile, dark mode, and images disabled. Do not claim universal client certification based on the preview gallery. There are no tracking pixels or remote image dependencies.

## Current review evidence

All 16 transport/template tests passed, including unsafe-link rejection, HTML escaping, required expiry copy, theme validation, and per-template configuration overrides. The packed package passed external ESM imports and TypeScript consumer contracts for the templates subpath.

The 20 generated examples were checked in Chromium at 320, 390, 768, and 1280 CSS pixels (80 checks). Every example had no horizontal overflow, a primary button at least 44 CSS pixels high, and primary-button text contrast at least 4.5:1. Verification, project invitation, announcement, and task-notification screenshots were visually inspected. Real Gmail/Outlook/Apple Mail and dark-mode inbox acceptance are still pending.
