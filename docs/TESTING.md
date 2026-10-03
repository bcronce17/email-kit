# Testing email-kit

Use Node 24 or newer. Install dependencies and Chromium once:

```sh
npm ci
npx playwright install chromium
```

On Linux machines without browser dependencies, use
`npx playwright install --with-deps chromium`.

## Commands and layers

| Command                    | Layer                       | Coverage                                                                                         |
| -------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------ |
| `npm run test:unit`        | Vitest unit tests           | Configuration, memory inbox, message validation, safe errors, template content and link policies |
| `npm run test:integration` | Vitest integration tests    | Real Nodemailer traffic to a local SMTP fixture                                                  |
| `npm run test:e2e`         | Playwright browser tests    | Compiled template HTML at desktop and mobile widths                                              |
| `npm run test:package`     | Distribution contract check | Packed ESM imports, declarations, and example adapters in a temporary consumer                   |
| `npm run test:coverage`    | Vitest coverage             | Unit and SMTP integration coverage for `src/`                                                    |
| `npm test`                 | All test layers             | Unit, integration, browser, and package checks                                                   |
| `npm run check`            | Type checking               | Strict TypeScript source compilation                                                             |
| `npm run lint`             | Lint and formatting         | ESLint checks source, examples, scripts, and tests; Prettier checks formatting                   |
| `npm run lint:fix`         | Automatic fixes             | Apply ESLint fixes and Prettier formatting                                                       |
| `npm run format:check`     | Formatting                  | Consistent source, scripts, tests, and documentation                                             |

Forward filters when working on one area:

```sh
npm run test:unit -- tests/unit/templates.test.mjs
npm run test:integration -- -t 'disconnect after DATA'
npm run test:e2e -- --project mobile
```

## What belongs in each layer

### Unit

Test observable outputs and errors through the library's public API. Rendering is
pure logic, so branding, translated copy, HTML escaping, subject validation,
expiry wording, and allowed link origins belong here. Memory mode and
configuration validation require no SMTP server or browser. Each renderer gets
its own parameterized test result so a failing template is easy to identify.

### SMTP integration

The fixture binds an ephemeral port on `127.0.0.1`. Tests use the real Nodemailer
transport and inspect wire traffic and returned errors. They check acceptance,
MIME alternatives, rejection status, disconnect after DATA, greeting timeout,
required STARTTLS failure, and draining a pending send during shutdown. Fixtures
close their sockets after each test. No Docker, Mailpit, Gmail account, or live
SMTP credentials are required.

These tests establish the library's transport behavior. Application tests should
use Mailpit when they need to establish that a registration, invitation, or worker
actually sends the expected message.

### Browser layout

Playwright loads generated HTML directly into Chromium without starting an app
or visiting action URLs. All ten renderers are checked at 1280px desktop and
375px mobile widths. Assertions cover readable headings, branding, matching
links, keyboard focus, action size, and horizontal overflow. A separate case
exercises long URLs, custom translated copy, long action labels, and details.

Chromium layout checks do not establish rendering compatibility with Outlook,
Gmail, or every email client. Review the preview gallery and representative real
inbox messages when changing email markup. Authentication, token expiry,
authorization, resend behavior, and user journeys remain consuming-app tests;
the library never issues or verifies account tokens.

### Distribution contract

The package check builds and packs the actual release files, installs the tarball
in a temporary consumer, checks declarations and example adapter types, and runs
an ESM import/send smoke check. It removes its temporary directory afterward.
This catches packaging and export mistakes that source-level tests cannot catch.
It does not establish milestone acceptance for Waiger, Keystone, or Gather.

## Reports and CI

GitHub's **Check email library** workflow runs on pushes, pull requests, and manual
dispatch. It checks ESLint, Prettier formatting, and types, runs Vitest with coverage, installs
Chromium, checks layouts, and verifies the packed package. Release checks run the
same test layers before publication.

Coverage HTML and LCOV are written to `coverage/`. CI uploads coverage and retains
Playwright HTML reports, screenshots, and traces when browser checks fail. Open a
local browser report with:

```sh
npx playwright show-report
```

Coverage reports help identify gaps; no percentage is a substitute for testing
security boundaries and delivery outcomes.
