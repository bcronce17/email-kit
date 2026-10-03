import { mkdtemp, writeFile, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('../', import.meta.url));

const consumerDirectory = await mkdtemp(join(tmpdir(), 'email-kit-consumer-'));

function run(command, args, directory = consumerDirectory) {
  return execFileSync(command, args, { cwd: directory, stdio: 'inherit' });
}

function packLibrary() {
  const output = execFileSync('npm', ['pack', '--json', '--pack-destination', consumerDirectory], {
    cwd: repository,
    encoding: 'utf8'
  });
  const [archive] = JSON.parse(output);

  return join(consumerDirectory, archive.filename);
}

async function prepareConsumer(archivePath) {
  await writeFile(join(consumerDirectory, 'package.json'), JSON.stringify({ private: true, type: 'module' }));

  run('npm', ['install', '--prefer-offline', '--ignore-scripts', archivePath]);

  for (const [source, destination] of [
    ['examples/consumers.ts', 'consumers.ts'],
    ['tests/fixtures/consumer-contract.ts', 'contract.ts'],
    ['tests/fixtures/package-smoke.mjs', 'smoke.mjs']
  ]) {
    await cp(join(repository, source), join(consumerDirectory, destination));
  }
}

function checkConsumerTypes() {
  run(process.execPath, [
    join(repository, 'node_modules/typescript/bin/tsc'),
    '--strict',
    '--skipLibCheck',
    '--noEmit',
    '--target',
    'ES2022',
    '--module',
    'NodeNext',
    '--moduleResolution',
    'NodeNext',
    'contract.ts'
  ]);
}

try {
  const archivePath = packLibrary();

  await prepareConsumer(archivePath);
  checkConsumerTypes();
  run(process.execPath, ['smoke.mjs']);
} finally {
  await rm(consumerDirectory, { recursive: true, force: true });
}
