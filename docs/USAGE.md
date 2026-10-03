# Usage and how-tos

Use the library in server code on Node.js 24+. Install the public package as shown
in [the startup guide](../README.md), then create one client per server instance.
The library reads explicit configuration; it does not load an application's
`.env`, infer an environment from `NODE_ENV`, or start a background worker.

## Choose a mode

| Mode      | Purpose                                                           | Needs an SMTP server? |
| --------- | ----------------------------------------------------------------- | --------------------- |
| `memory`  | Local experimentation and isolated tests; inspect `getMessages()` | No                    |
| `capture` | Inspect messages in Mailpit or another capture inbox              | Yes, a capture server |
| `live`    | Send real messages through your SMTP provider                     | Yes, a live provider  |

Set `environment` to `development`, `test`, `preview`, or `production`.
Production requires live mode. Non-production live mode requires an exact
recipient allowlist. Hosting platforms may set `NODE_ENV=production` for preview
builds, so select the email environment from trusted application configuration.

## Capture email locally

The repository provides an optional Mailpit service:

```sh
docker compose -f examples/compose.yaml up -d
# Open http://localhost:8025
```

From an application running on the same host, replace the memory configuration
in the [startup example](../README.md#use-it-in-your-application) with:

```js
const email = createEmailClient({
  mode: 'capture',
  environment: 'development',
  from: { name: 'My app', address: 'sender@example.test' },
  smtp: { host: '127.0.0.1', port: 1025, tls: 'none' }
});
```

Keep the send and shutdown steps; remove `getMessages()`, which works only in
memory mode. Inspect the result in Mailpit. It captures mail without forwarding.

To change host ports, use:

```sh
EMAIL_SMTP_PORT=1026 EMAIL_UI_PORT=8026 docker compose -f examples/compose.yaml up -d
```

Use the chosen SMTP port in your client and UI port in your browser. This changes
ports for this Compose service; it does not create a second independent inbox.
For independent app inboxes, copy the service into each application's Compose
setup. Suggested host pairs: Waiger 1025/8025, Keystone 1026/8026, Gather 1027/8027.
Containerized apps on the same Compose network use host `mail`, internal port
1025, and `captureHosts: ['mail']`.

Stop the service with the same Compose file and port overrides used at startup:

```sh
docker compose -f examples/compose.yaml down
```

Docker is optional. An existing Mailpit or other capture SMTP server also works:
configure its host and port. Loopback hosts are approved by default; use
`captureHosts` for additional trusted endpoints that you know do not relay mail.
Capture credentials require TLS. The npm preview and library tests need no
capture server.

### Mailpit without Docker

Install Mailpit using its [official installation guide](https://mailpit.axllent.org/docs/install/).
On macOS, `brew install mailpit` is an option. Linux/macOS/Windows users can
extract the appropriate standalone binary from the linked releases and put
`mailpit` (`mailpit.exe` on Windows) on `PATH`. Check `mailpit --version`.

Start it in a separate terminal:

```sh
mailpit --smtp 127.0.0.1:1025 --listen 127.0.0.1:8025
```

Open [localhost:8025](http://localhost:8025) and use the capture client example
above. The process runs in the foreground; Ctrl+C stops it. Loopback bindings
follow [Mailpit's runtime options](https://mailpit.axllent.org/docs/configuration/runtime-options/).
Use a plain local installation without relay or forwarding configuration.
Do not run native and Docker Mailpit on the same ports.

For another inbox, change both flags and match the client SMTP port:

```sh
mailpit --smtp 127.0.0.1:1030 --listen 127.0.0.1:8030
```

Set `smtp.port: 1030` and open `http://localhost:8030`. Direct Mailpit invocation
and the core email-kit library do not load your application's `.env`.
`EMAIL_SMTP_PORT`/`EMAIL_UI_PORT` in the Compose example configure Docker's host
mappings; they do not automatically configure this native command.

If your application prefers an npm command, add this to its `package.json`:

```json
{
  "scripts": {
    "mailpit:start": "mailpit --smtp 127.0.0.1:1025 --listen 127.0.0.1:8025"
  }
}
```

Then run `npm run mailpit:start`. This is an optional consuming-app script, not a
script already defined in email-kit. It requires the installed native binary;
npm does not install Mailpit. For development that needs no inbox UI, use memory
mode. Template previews and every email-kit test layer work without Docker or
Mailpit; integration tests start their own disposable SMTP fixture.

## Configure production SMTP

Read credentials from your application's secret configuration, then supply:

```js
const email = createEmailClient({
  mode: 'live',
  environment: 'production',
  from: { name: 'My app', address: configuredSender },
  smtp: {
    host: configuredHost,
    port: 587,
    tls: 'starttls',
    auth: { user: configuredUser, pass: configuredPassword }
  }
});
```

The `configured*` values come from your application; they are not globals provided
by this library. Use `implicit` for TLS from connection start (typically port
465), or `starttls` for a required upgrade (typically 587). Certificates are
verified. Live mode rejects plaintext and senders using reserved development
suffixes `.test`, `.local`, and `.invalid`.

TLS relays without authentication can omit `auth`; partial credentials are
invalid. Optional `smtp.servername` supplies the certificate hostname when
connecting to an IP address. The public API supports username/password SMTP
authentication; OAuth token refresh is application integration work.

For live development or preview delivery, also set
`recipientAllowlist: ['approved@example.com']`. Production can use an allowlist
too. Never place real credentials in examples, source, or logs.

## Client API and delivery outcomes

| Method                              | Behavior                                                                         |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `createEmailClient(config)`         | Validates and snapshots configuration without connecting                         |
| `send(message)`                     | Makes one attempt for one recipient; returns `{ messageId, accepted, rejected }` |
| `verify()`                          | Checks SMTP connection/authentication; memory mode needs no network              |
| `close()`                           | Stops new operations and waits for pending operations                            |
| `getMessages()` / `clearMessages()` | Inspect detached inbox copies or clear them in memory mode                       |

A message requires `to`, `subject`, and `text`; optional fields are `html`,
`replyTo`, and `messageId`. Mailboxes accept a plain address or
`{ address, name? }`. Address lists are rejected. Undeclared message fields,
including Bcc, attachment paths, and envelope overrides, are discarded.

Await every send and close the client at shutdown. SMTP acceptance means the
server accepted the message, not that an inbox received it or a user read it.
`verify()` does not prove delivery. Caller message IDs do not guarantee deduplication.

`EmailSendError` exposes sanitized `code`, SMTP rejection `responseCode`, and
`outcome: 'rejected' | 'uncertain'`, without the raw response or cause. There is
no automatic retry, including after uncertain acceptance. Applications own
recovery and any durable queue.

Connection, greeting, and DNS timeouts default to 10 seconds; socket idle timeout
is 30 seconds. Set `smtp.timeouts` fields `connection`, `greeting`, `dns`, or
`socket` in milliseconds from 1 to 120000. Idle timeout is not a total send
deadline. Transport is unpooled with a new connection per operation; content
file/URL access and SMTP debug logging are disabled.

## Add diagnostic commands to an application

Copy [examples/diagnostic.mjs](../examples/diagnostic.mjs) into the consuming app
and add scripts to its `package.json`:

```json
{
  "scripts": {
    "email:check": "node examples/diagnostic.mjs check",
    "email:test": "node examples/diagnostic.mjs test"
  }
}
```

These are consumer scripts, not existing scripts in this library. Supply
`EMAIL_MODE`, `EMAIL_ENVIRONMENT`, and `EMAIL_FROM` through the app environment.
Capture/live modes also require `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, and
`EMAIL_SMTP_TLS`. Optional settings include `EMAIL_FROM_NAME`,
`EMAIL_SMTP_USER`, `EMAIL_SMTP_PASSWORD`, `EMAIL_CAPTURE_HOSTS`,
`EMAIL_RECIPIENT_ALLOWLIST`, and `EMAIL_TEST_TO`. Comma-separated capture hosts
and recipient allowlists are supported by this diagnostic adapter.

`email:check` verifies the transport without sending. `email:test` sends a
synthetic message. The script does not load `.env` automatically; for an app that
uses it, adapt the command to `node --env-file=.env examples/diagnostic.mjs test`.
Live diagnostic sends additionally require `npm run email:test -- --live` and a
recipient allowlist, even in production. Live test recipients must be real,
approved addresses supplied through `EMAIL_TEST_TO`.

## Developer exercises

1. **Capture a first message.** Run the README's memory example. Change its subject
   and recipient and inspect the resulting message. Then try capture mode and
   find the same message in Mailpit.
2. **Brand a verification email.** Follow [TEMPLATES.md](../TEMPLATES.md) to render
   a verification message with your app's brand, approved action origin, and
   truthful expiry wording. Pass `{ to, ...rendered }` to `send`. Use synthetic
   token URLs locally; the app owns token verification and real expiry.
3. **Change and verify a template.** In the library checkout, run
   `npm run preview:templates`, inspect HTML and plain text, then run
   `npm run test:unit -- tests/unit/templates.test.mjs` and
   `npm run test:e2e`. Browser layout checks do not certify all email clients.
4. **Integrate without moving app responsibilities.** Use
   [examples/consumers.ts](../examples/consumers.ts) for adapter shapes. Keep account
   flows, permissions, worker recovery, and app acceptance tests in the consumer.
   These examples do not prove that an application has already migrated.

For evaluating unpublished library changes in an app, run `npm pack` in the
library checkout and install the printed archive path in a temporary consumer.
Use a published exact version and committed lockfile for deployments; see
[PUBLISHING.md](../PUBLISHING.md). Publishing does not update or deploy apps.
