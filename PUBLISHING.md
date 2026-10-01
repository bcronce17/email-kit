# First npm release

GitHub hosts the source at https://github.com/bcronce17/email-kit. npmjs.com hosts installable versions. Creating the GitHub repository does not publish an npm package.

## Account setup

1. Create an account at https://www.npmjs.com/signup, verify your email, and enable two-factor authentication.
2. Run `npm login` in a terminal and complete the browser sign-in.
3. Run `npm whoami` to confirm your npm username.

The package uses the confirmed personal scope `@bcronce17`: `@bcronce17/email-kit`. Authenticate as bcronce17 before publishing.

## Release preparation

Public publishing is configured through `publishConfig` with access public and the npmjs registry. The package is prepared as version 0.1.0; verify registry availability after the publish command succeeds.

```sh
npm ci
npm run check
npm test
npm run test:package
npm publish --dry-run
```

Confirm that the artifact includes compiled JavaScript, declarations, README, and LICENSE. Commit the release metadata and tag the tested release. The current CI checks code; it does not publish automatically.

## Publish

After reviewing and authorizing the release:

```sh
npm publish --access public
```

Complete npm's authentication/2FA prompt when requested. Then verify the registry version and replace Waiger's vendored tarball dependency with the exact published version and lockfile. Keystone/Gather can install the same package independently. Waiger's existing artifact continues working until that migration.

For later automation, evaluate npm trusted publishing through GitHub Actions after the first account/package setup. No publishing credentials or release workflow are configured yet.

References: [public scoped packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/), [publishing authentication](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/).
