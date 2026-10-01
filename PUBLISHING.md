# GitHub Packages releases

Source: https://github.com/bcronce17/email-kit. Package: `@bcronce17/email-kit`, hosted at `https://npm.pkg.github.com`. No npmjs.com account is needed. The npm CLI remains the build/install tool.

## Publishing

The `Publish email-kit` GitHub Actions workflow builds, typechecks, tests, validates a packed artifact, publishes, and installs the registry version in a clean consumer. It uses the repository's built-in `GITHUB_TOKEN` with `packages: write`; no personal publishing token is stored.

For the first release, run the workflow on `main`. For later releases, bump the package/lockfile version, commit, and push a matching `v<version>` tag. Never reuse a published version. Manual dispatch is limited to main; a tag must match package.json. Concurrent publishing runs are serialized.

GitHub initially creates packages with private visibility, independently of repository visibility. After the first publication, open https://github.com/users/bcronce17/packages/npm/email-kit/settings and set visibility to **Public**. Keep repository permission inheritance enabled. Add Waiger (and later Keystone/Gather) with Read access under **Manage Actions access** if needed for their built-in workflow tokens. Local and Vercel installs require authentication even for a public npm package on GitHub.

## Local and Vercel installs

Create a GitHub **personal access token (classic)** with `read:packages`. Store it in your environment as `NODE_AUTH_TOKEN`; do not commit or share it. Use an appropriate expiry and rotate it before expiry. Vercel's direct builds need the same variable configured separately for each applicable build environment. The repository's normal GitHub OAuth login is not a substitute for this classic package token.

In each consumer's .npmrc:

```ini
@bcronce17:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```sh
npm install --save-exact @bcronce17/email-kit@0.1.0
```

Only the bcronce17 scope uses GitHub; other packages continue using the normal npm registry. GitHub Actions consumers can instead use `GITHUB_TOKEN` when granted access to the package and `packages: read` in the workflow. Do not place literal tokens in repository files or lockfiles.

## Consumer rollout

Waiger replaces its original vendored package with an exact registry version and new import scope once registry installation is verified. Its local capture and production SMTP settings remain application configuration. Hosted SMTP receipt/link validation is independent of package installation. Keystone and Gather can adopt the same released package later.

References: [GitHub npm registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry), [package visibility and Actions access](https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility).
