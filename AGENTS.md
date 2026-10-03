# email-kit agent instructions

These repository instructions record established project decisions and maintainer
preferences. Keep them concise and current; use the linked documentation when a
task needs more detail. The user's current instructions take precedence over
these notes.

## Purpose and boundaries

- `@brim-software/email-kit` is a public, framework-independent server email
  library for Waiger, Keystone, Gather, and other consumers. Consider all three
  existing applications when changing shared behavior; their individual plans
  are inputs, not the library's specification.
- Keep SMTP delivery, local capture, memory testing, and reusable templates simple
  to use. Keep framework adapters and product-specific behavior in consuming apps
  or examples. Preserve public exports and TypeScript consumer contracts when
  making compatible changes.
- Consuming apps own authentication, token issuance and verification, actual link
  expiry, single use, authorization, rate limiting, recipient selection, durable
  workers, and delivery recovery. Templates display caller-supplied expiry wording
  that must match the application's real deadline.
- Public installation must work without a developer's personal registry token.
  Publishing the library and updating or deploying an application are separate
  actions; library tests do not establish application milestone acceptance.

## Code and templates

- Prefer focused functions, clear names, explicit inputs, and shared logic where
  it removes real duplication. Preserve vertical spacing between logical steps;
  keep email HTML readable rather than compressing markup into dense strings.
- Follow the existing ESLint and Prettier configurations, aligned with Waiger.
  Keep any lint suppression narrow and explain why it is necessary.
- Keep templates pure and independently renderable. Return matching subject,
  HTML, and plain text. Support consuming-app branding, copy, language, and
  approved link origins through the public options.
- Maintain responsive table layouts, inline styles, accessible contrast, usable
  buttons, and wrapping for long content. Escape user-visible values and validate
  URLs; customization must not become an arbitrary HTML or CSS injection path.
- Edit source and fixtures rather than generated `dist/`, previews, reports, or
  package archives. Keep manifest and lockfile changes together.

## Delivery and security

- Preserve explicit environment and transport configuration: memory for tests,
  capture for local development, and live SMTP for production. Local app flows
  can use Mailpit; library SMTP tests use their own disposable server.
- Preserve verified TLS for live SMTP, exact recipient allowlists for
  non-production live delivery, capture-host restrictions, and message/header
  validation. Keep Nodemailer's file/URL content access and debug logging disabled.
- Send once per call. An uncertain result after SMTP DATA must not trigger an
  automatic resend. SMTP acceptance does not prove inbox delivery or reading.
- Await sends and client shutdown. Keep errors sanitized; do not expose raw SMTP
  responses, credentials, email bodies, or token URLs in logs or fixtures.
- Trusted application settings supply allowed link origins. Local HTTP is an
  explicit loopback-only development exception. Rendering a link must not issue
  tokens, grant access, or claim to enforce expiry.

## Verification at the appropriate layer

Use Node 24 or newer and `npm ci`. Choose checks based on what changed:

| Area                  | Command                    | Responsibility                                                                |
| --------------------- | -------------------------- | ----------------------------------------------------------------------------- |
| Pure library behavior | `npm run test:unit`        | Vitest: validation, memory client, errors, template content and link policies |
| SMTP behavior         | `npm run test:integration` | Vitest: real local Nodemailer traffic, failure outcomes and lifecycle         |
| Template layout       | `npm run test:e2e`         | Playwright: compiled HTML, desktop/mobile layout, focus and overflow          |
| Distribution          | `npm run test:package`     | Packed package imports, declarations and temporary consumer contracts         |
| Types                 | `npm run check`            | Strict TypeScript compilation                                                 |
| Code quality          | `npm run lint`             | ESLint and Prettier checks                                                    |

- Test observable behavior at its owning layer. Account journeys, resend rules,
  expiry enforcement, and permissions belong in consuming-app tests.
- Local unit, SMTP, and layout tests send no live mail. Run affected tests and
  resolve failures caused by the requested change without asking permission at
  each step; honor tool sandbox requirements when they apply.
- For a release or a change spanning delivery, templates, or public packaging,
  use `npm run lint`, `npm run check`, and `npm test`. Install Chromium with
  `npx playwright install chromium` when needed. CI and publication must retain
  lint, formatting, type checks, and every test layer.
- Documentation-only edits need formatting and link checks. Avoid unrelated
  test expansion. Chromium checks do not certify Gmail, Outlook, Apple Mail,
  dark mode, or universal device compatibility; report actual evidence and limits.

## Relevant documentation and workflows

- [README.md](README.md): public API, transport configuration, consumer boundaries.
- [TEMPLATES.md](TEMPLATES.md): template options, security policy, previews and
  email-client review. Use `npm run preview:templates` for markup review.
- [docs/TESTING.md](docs/TESTING.md): test setup, filters, fixtures and reports.
- [PUBLISHING.md](PUBLISHING.md): versioning, tagged releases, trusted GitHub
  Actions publishing, anonymous registry verification and consumer adoption.
  Release versions cannot be reused. Manual publish dispatch can publish unless
  `verify_only=true`; use the CI workflow for ordinary validation.

Complete the requested work and its relevant verification, preserve unrelated
local changes, and report what changed, what was checked, and remaining limits.
Carry forward authorization already given in the conversation. Follow the
documented release process when publication is requested.

Maintain this file as durable guidance, not a transcript or task log. Avoid
embedding temporary status, test counts, release versions, secrets, or personal
machine paths. Add nested instruction files only when a subtree needs different
rules. Structure follows the official
[Codex AGENTS.md guide](https://learn.chatgpt.com/docs/agent-configuration/agents-md).
