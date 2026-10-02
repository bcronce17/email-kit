# Public npm releases

Source: https://github.com/brim-software/email-kit. Intended package: `@brim-software/email-kit` on https://registry.npmjs.org. Public npm publication is pending; the existing GitHub Packages release is a separate historical distribution.

## First release

1. Create the npm organization `brim-software` and grant the publishing maintainer package creation access. The GitHub organization does not create the npm organization.
2. Enable npm two-factor authentication and log in locally with `npm login --registry=https://registry.npmjs.org`. Never paste credentials into source or chat.
3. Run `npm ci`, `npm run check`, `npm test`, and `npm run test:package`.
4. Publish the initial package from the committed main checkout with `npm publish --access public --registry=https://registry.npmjs.org`. Complete npm's interactive authentication requirements.
5. In the package's npm settings, add a GitHub Actions trusted publisher: organization `brim-software`, repository `email-kit`, workflow filename `publish.yml`; leave environment blank. Allow direct publishing.

The initial publication establishes the package for its settings. Do not run the publishing workflow until trusted publishing is configured.

## Subsequent releases

Bump package.json and package-lock.json together, commit, and push a matching `v<version>` tag. Never reuse a published version. The workflow verifies the release ref, runs checks, publishes with OIDC, and installs the public registry package in a clean consumer. Manual dispatch is restricted to main. No npm publishing token is stored in GitHub.

## Consumer installation

After publication:

```sh
npm install --save-exact @brim-software/email-kit@0.1.0
```

Commit the lockfile. Teammates, CI, and Vercel need no npm account or registry token. Runtime SMTP credentials are application settings and remain necessary for live email. Keystone can use its existing pnpm package manager.

Waiger's registry migration remains pending until the package is published and anonymous installation verified. Keystone and Gather adoption remains separate work.

Reference: [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).
