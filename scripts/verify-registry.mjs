import { mkdtemp, writeFile, readFile, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const metadata = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

const packageSpec = `${metadata.name}@${metadata.version}`;

const verificationDirectory = await mkdtemp(join(tmpdir(), 'email-kit-registry-'));

const metadataAttempts = 18;
const metadataRetryDelay = 10_000;

async function createAnonymousNpmEnvironment(directory) {
  const environment = { ...process.env };

  for (const key of Object.keys(environment)) {
    if (/token|auth|npm_config|actions_id_token/i.test(key)) {
      delete environment[key];
    }
  }

  await writeFile(join(directory, 'user.npmrc'), '');
  await writeFile(join(directory, 'global.npmrc'), '');

  return {
    ...environment,
    NPM_CONFIG_USERCONFIG: join(directory, 'user.npmrc'),
    NPM_CONFIG_GLOBALCONFIG: join(directory, 'global.npmrc'),
    NPM_CONFIG_CACHE: join(directory, 'cache'),
    NPM_CONFIG_REGISTRY: 'https://registry.npmjs.org'
  };
}

async function installPublishedPackage(environment) {
  for (let attempt = 1; attempt <= metadataAttempts; attempt++) {
    const result = spawnSync(
      'npm',
      ['install', '--ignore-scripts', '--save-exact', '--prefer-online', '--fetch-retries=0', packageSpec],
      { cwd: verificationDirectory, env: environment, encoding: 'utf8', timeout: 30_000 }
    );

    if (result.status === 0) {
      console.log(result.stdout.trim());

      return;
    }

    if (result.error || !/\b(E404|ETARGET)\b/.test(result.stderr ?? '')) {
      throw new Error(result.stderr || 'Registry installation failed');
    }

    if (attempt < metadataAttempts) {
      console.log(`Waiting for public npm version metadata (${attempt}/${metadataAttempts})`);
      await delay(metadataRetryDelay);
    }
  }

  throw new Error('Public npm version did not become installable within the verification window');
}

try {
  const environment = await createAnonymousNpmEnvironment(verificationDirectory);

  await writeFile(join(verificationDirectory, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  await installPublishedPackage(environment);
  await cp(new URL('../tests/fixtures/registry-smoke.mjs', import.meta.url), join(verificationDirectory, 'smoke.mjs'));

  execFileSync(process.execPath, ['smoke.mjs'], {
    cwd: verificationDirectory,
    env: environment,
    stdio: 'inherit'
  });
} finally {
  await rm(verificationDirectory, { recursive: true, force: true });
}
