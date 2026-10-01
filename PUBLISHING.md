# First npm release

GitHub hosts the source at https://github.com/bcronce17/app-email. npmjs.com hosts installable versions. Creating the GitHub repository does not publish an npm package.

## Account setup

1. Create an account at https://www.npmjs.com/signup, verify your email, and enable two-factor authentication.
2. Run `npm login` in a terminal and complete the browser sign-in.
3. Run `npm whoami` to confirm your npm username.

Your personal package scope follows your npm username, which can differ from GitHub. The current name `@bcronce/app-email` is provisional. If your npm username differs, update the name, examples/imports, and package validation before publishing. An organization scope requires permission to publish there.

## Release preparation

Keep `private: true` until the package name and first release are ready. For the approved release, remove that flag and add `publishConfig: { "access": "public", "registry": "https://registry.npmjs.org/" }` to package.json. Update the lockfile.

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
