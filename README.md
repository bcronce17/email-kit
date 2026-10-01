# email-kit

A server-only TypeScript email client for Waiger, Keystone, and Gather. SMTP in production, Mailpit capture locally, and an isolated memory inbox in tests. No framework, database, worker, or provider account is required by the library.

Requires Node 24+. Source: [bcronce17/email-kit](https://github.com/bcronce17/email-kit). Licensed under [MIT](LICENSE). Package name is provisionally `@bcronce/email-kit`; publishing remains disabled with `private: true` until the npm account/scope is confirmed.

## Install and develop

```sh
npm ci
npm test
npm run test:package
npm pack
```

Install the resulting tarball in a consumer for local evaluation. Deployments should eventually install an immutable registry version with a committed lockfile. Do not deploy sibling-folder dependencies. `npm pack` includes compiled ESM, declarations, examples, and this README; it excludes tests, credentials, and source build tooling.

## Capture local email

```sh
docker compose -f examples/compose.yaml up -d
```

Open http://localhost:8025. Mailpit captures messages without forwarding them. Use host SMTP/UI ports 1025/8025 for Waiger, 1026/8026 for Keystone, and 1027/8027 for Gather via `EMAIL_SMTP_PORT`/`EMAIL_UI_PORT`. Copy the service into each application's Compose file for independent startup. Containerized apps use host `mail` and internal port 1025, explicitly approved through `captureHosts: ['mail']`.

Copy `examples/diagnostic.mjs` into a consumer and add `email:check` / `email:test` scripts invoking it with `check` / `test`. Configure `EMAIL_MODE`, `EMAIL_ENVIRONMENT`, `EMAIL_FROM`, `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, and `EMAIL_SMTP_TLS`. Optional variables include `EMAIL_FROM_NAME`, SMTP credentials, `EMAIL_CAPTURE_HOSTS`, `EMAIL_RECIPIENT_ALLOWLIST`, and `EMAIL_TEST_TO`. Live diagnostic sends additionally require `--live` and an allowlist, including in production.

```ts
import { createEmailClient } from '@bcronce/email-kit';

const email = createEmailClient({
  mode: 'capture', environment: 'development',
  from: { name: 'Waiger', address: 'no-reply@waiger.test' },
  smtp: { host: '127.0.0.1', port: 1025, tls: 'none' },
});
await email.send({
  to: 'developer@example.test', subject: 'Verify your email',
  text: `Verify your email: ${verificationUrl}`,
});
```

Capture hosts default to localhost, 127.0.0.1, and ::1. `captureHosts` explicitly approves additional container or hosted capture endpoints; the application must ensure those endpoints do not relay mail. Hosting may compile preview builds with `NODE_ENV=production`, so `environment` is explicit and is never inferred from that variable.

## Live email

```ts
const email = createEmailClient({
  mode: 'live', environment: 'production',
  from: { name: 'Your app', address: 'no-reply@your-domain.com' },
  smtp: {
    host: configuredHost, port: 587, tls: 'starttls',
    auth: { user: configuredUser, pass: configuredPassword },
  },
});
```

Use `implicit` for TLS from connection start (usually port 465) or `starttls` for a required upgrade (usually 587). Certificates are verified. Unauthenticated TLS relays can omit `auth`; partial credentials fail configuration validation. `servername` supports certificate verification when the host is an IP address. Live mode rejects plaintext and `.test`, `.local`, or `.invalid` senders. Non-production live delivery requires an exact recipient allowlist; production may also use one.

Gmail app passwords can use the same SMTP configuration; a normal Google account password is not supported. OAuth token refresh integration is not included in version 0.1. See [Nodemailer's Gmail guide](https://nodemailer.com/guides/using-gmail). Preserve Waiger's working SMTP provider when adopting this package.

## API and behavior

- `createEmailClient(config)` validates and snapshots config without connecting. Requires `mode`, `environment`, and a sender mailbox.
- `send({ to, subject, text, html?, replyTo?, messageId? })` performs one attempt for one recipient. Mailboxes are a plain address or `{ address, name? }`; comma-separated recipients are rejected. Text is required. Templates, HTML escaping, and approved link origins belong to the app.
- Result: `{ messageId, accepted, rejected }`. Accepted means SMTP acceptance, not inbox receipt or reading. Caller IDs are preserved but do not guarantee deduplication.
- `EmailSendError` preserves sanitized `code`, SMTP rejection `responseCode`, and `outcome: 'rejected' | 'uncertain'`. It deliberately omits the original response/body/address and has no raw cause. Gather can keep its response-code classifier. No automatic resend occurs, including after uncertain acceptance.
- `verify()` explicitly checks connection/authentication; it does not prove message delivery. Memory mode resolves without network access.
- `close()` prevents new operations and waits for pending operations. Await it at worker shutdown. Requests must await `send`; Vercel background delivery is not started by the package.
- `getMessages()` and `clearMessages()` work only in memory mode. Returned messages are detached copies.

Timeout defaults: connection/greeting/DNS 10 seconds and socket idle 30 seconds. Each is configurable from 1 to 120000 ms. Socket timeouts are idle limits, not a total request deadline; ensure function budgets accommodate the entire send. Transport is unpooled and reused as an object, with new connections per operation. Content file/URL access and SMTP debug logging are disabled. Additional undeclared message fields such as Bcc, envelope overrides, and attachment paths are discarded.

```ts
const email = createEmailClient({
  mode: 'memory', environment: 'test',
  from: { address: 'sender@example.test' },
});
await email.send({ to: 'member@example.test', subject: 'Invitation', text: 'Your link' });
const captured = email.getMessages();
await email.close();
```

## Consumer adoption

[examples/consumers.ts](examples/consumers.ts) shows Nuxt runtime-config mapping for Waiger and async account/announcement wrappers for Keystone/Gather. Keep each app's existing service functions, subjects, HTML/text, token ownership, expiration, permissions, and link-origin configuration. Instantiate once per server instance and inject the client into app services where useful.

Waiger uses the core directly inside awaited verification/resend requests. Keystone uses it behind Better Auth and invitation helpers. Gather uses it behind its mailer and existing durable announcement worker. Gather's MailHog SMTP endpoint can remain during adoption; switching MailHog API tests to Mailpit is separate work.

Library completion does not establish application milestone acceptance. Validate Waiger's deployed verification flow, Keystone's account and scoped invitation journeys plus preserved M2 in-app notifications, and Gather's M2 portal invitation/onboarding and M4 announcement failure contracts. Hosted tests for Keystone/Gather remain pending until deployment. Invitation commit/send recovery and optional durable delivery remain application work.

## Validation and distribution

`npm test` exercises real local SMTP acceptance, rejection, post-DATA disconnects, greeting timeout, required TLS failure, shutdown draining, memory isolation, validation, and allowlists. It sends no external email. `npm run test:package` installs the tarball in a clean temporary consumer, typechecks all three adapter contracts, and verifies ESM imports. CI runs both checks on Node 24. A release must additionally build consumer adapters and record application acceptance separately. The public source repository is hosted on GitHub; npm publishing is a separate step. See [PUBLISHING.md](PUBLISHING.md) for account setup and the first release.

SMTP configuration follows [Nodemailer's transport documentation](https://nodemailer.com/smtp). Mailpit inbox automation can use its [API](https://mailpit.axllent.org/docs/api-v1/); poll for a unique recipient/marker rather than deleting another developer's messages.
