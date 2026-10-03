import { readFile } from 'node:fs/promises';

const metadata = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

const { GITHUB_REF_TYPE: refType, GITHUB_REF_NAME: refName } = process.env;

if (refType === 'tag') {
  if (refName !== `v${metadata.version}`) {
    throw new Error('Tag must match package version');
  }
} else if (refName !== 'main') {
  throw new Error('Manual publication must use main');
}
