# email-kit

Reusable server email delivery and configurable HTML/plain-text templates for
Node.js 24+. Supports SMTP, a local capture inbox, and memory tests.

## Use it in your application

Install from public npm; no registry account or token is needed:

```sh
npm install --save-exact @brim-software/email-kit
```

Save this as `email-demo.mjs` in your application:

```js
import { createEmailClient } from '@brim-software/email-kit';

const email = createEmailClient({
  mode: 'memory',
  environment: 'development',
  from: { name: 'My app', address: 'sender@example.test' }
});

try {
  await email.send({
    to: 'developer@example.test',
    subject: 'Hello from email-kit',
    text: 'Your first development email.'
  });

  console.log(email.getMessages());
} finally {
  await email.close();
}
```

Run `node email-demo.mjs`. This captures the message in memory and prints it;
no email account, SMTP server, or Docker is needed.

## Develop this library

Run these commands from the repository root:

```sh
git clone https://github.com/brim-software/email-kit.git
cd email-kit
npm ci
npm run build
npm run preview:templates
```

Open `.previews/index.html` to inspect the generated email gallery. It includes
HTML and plain-text examples and sends no mail. This project is a library, so
there is no standalone app server or `npm run dev` command.

For the full test suite:

```sh
npx playwright install chromium
npm run lint
npm run check
npm test
```

Linux systems missing browser dependencies can use
`npx playwright install --with-deps chromium`. Tests need no Docker or live SMTP
credentials. See the [testing guide](docs/TESTING.md) for individual test layers.

## Optional: inspect sent mail in Mailpit

For an SMTP inbox in your browser, install Docker with Compose support and run:

```sh
docker compose -f examples/compose.yaml up -d
```

The file is [examples/compose.yaml](examples/compose.yaml), not a root Compose
file. Open [localhost:8025](http://localhost:8025). Configure your application for
`mode: 'capture'` with SMTP host `127.0.0.1`, port `1025`, and TLS `'none'`.
The [capture how-to](docs/USAGE.md#capture-email-locally) includes a configuration
example, port overrides, shutdown, and using an existing capture server.

**Without Docker:** install the [standalone Mailpit binary](https://mailpit.axllent.org/docs/install/),
put it on `PATH`, and run:

```sh
mailpit --smtp 127.0.0.1:1025 --listen 127.0.0.1:8025
```

Use the same capture configuration above. See the
[native Mailpit how-to](docs/USAGE.md#mailpit-without-docker) for installation,
custom ports, and an optional consuming-app npm command. Memory mode, previews,
and all library tests already run without Docker or an installed Mailpit server.

## Guides and developer exercises

| Goal                                                                         | Guide                                                    |
| ---------------------------------------------------------------------------- | -------------------------------------------------------- |
| Configure capture or production SMTP; understand the client API              | [Usage and how-tos](docs/USAGE.md)                       |
| Add verification, reset, invitation, announcement, or notification templates | [Template guide](TEMPLATES.md)                           |
| Learn by sending, branding, and testing a development message                | [Developer exercises](docs/USAGE.md#developer-exercises) |
| Run Vitest, Playwright, coverage, or package checks                          | [Testing guide](docs/TESTING.md)                         |
| Publish a release or adopt it in an application                              | [Release guide](PUBLISHING.md)                           |

Applications own token creation, real expiry, authorization, and delivery recovery.
SMTP acceptance is not proof of inbox delivery. See the usage and template guides
for these boundaries.

[Source](https://github.com/brim-software/email-kit) · [MIT license](LICENSE)
