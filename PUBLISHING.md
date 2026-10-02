# Public npm releases

Source: https://github.com/brim-software/email-kit. Package: `@brim-software/email-kit` on public npm. Version 0.1.0 is published. Anonymous installation and runtime smoke verification passed with empty npm configuration and a fresh cache.

GitHub Actions trusted publishing is configured for repository `brim-software/email-kit`, workflow `publish.yml`, with publish and stage-publish permissions. No stored npm publishing token is required. The first release was published interactively with npm 2FA.

## Release a new version

Start from an up-to-date, clean main checkout. Use patch for compatible fixes, minor for compatible features, major for breaking changes. Before 1.0, communicate breaking changes explicitly.

```sh
git switch main
git pull --ff-only
npm ci
npm run check
npm test
npm run test:package
npm version patch --no-git-tag-version
git add package.json package-lock.json
git commit -m "Release email-kit 0.1.1"
git push origin main
git tag v0.1.1
git push origin v0.1.1
```

The example assumes the current version is 0.1.0. Adjust the commit message and tag to the actual new version. The workflow verifies that the tag matches package.json, repeats checks, publishes to npm, and verifies registry installation. Review the publish run in GitHub Actions before updating applications. Never reuse a published version. Manual workflow dispatch is limited to main and is intended only for an unpublished version after a failed release.

## Adopt a release

```sh
npm install --save-exact @brim-software/email-kit@0.1.1
```

Keystone uses `pnpm add --save-exact @brim-software/email-kit@0.1.1`. Verify affected email flows and commit each application's manifest and lockfile. Publishing does not update or deploy applications automatically. Developers, CI, and Vercel need no npm account or registry token. Runtime SMTP credentials remain application configuration.

Reference: [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).
