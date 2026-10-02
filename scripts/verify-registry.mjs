import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
const metadata = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const cwd = await mkdtemp(join(tmpdir(), 'email-kit-registry-'));
const env = { ...process.env };
for (const key of Object.keys(env)) if (/token|auth|npm_config|actions_id_token/i.test(key)) delete env[key];
await writeFile(join(cwd,'user.npmrc'),'');
await writeFile(join(cwd,'global.npmrc'),'');
env.NPM_CONFIG_USERCONFIG = join(cwd,'user.npmrc');
env.NPM_CONFIG_GLOBALCONFIG = join(cwd,'global.npmrc');
env.NPM_CONFIG_CACHE = join(cwd,'cache');
env.NPM_CONFIG_REGISTRY = 'https://registry.npmjs.org';
await writeFile(join(cwd,'package.json'),JSON.stringify({private:true,type:'module'}));
const spec = `${metadata.name}@${metadata.version}`;
let installed = false;
for (let attempt=1; attempt<=18; attempt++) {
  const result=spawnSync('npm',['install','--ignore-scripts','--save-exact','--prefer-online','--fetch-retries=0',spec],
    {cwd,env,encoding:'utf8',timeout:30000});
  if (result.status===0) { console.log(result.stdout.trim()); installed=true; break; }
  if (result.error || !/\b(E404|ETARGET)\b/.test(result.stderr)) {
    console.error(result.stderr || 'Registry installation failed');
    process.exit(1);
  }
  if(attempt===18) break;
  console.log(`Waiting for public npm version metadata (${attempt}/18)`);
  await new Promise(resolve=>setTimeout(resolve,10000));
}
if(!installed) throw new Error('Public npm version did not become installable within the verification window');
await writeFile(join(cwd,'smoke.mjs'),`
import assert from 'node:assert/strict';
import { createEmailClient } from '${metadata.name}';
import { renderVerificationEmail, renderAnnouncementEmail } from '${metadata.name}/templates';
const client=createEmailClient({mode:'memory',environment:'test',from:{address:'sender@example.test'}});
const message=renderVerificationEmail({brand:{name:'External app'},actionUrl:'https://example.com/verify',expirationText:'Expires in 1 hour.'});
await client.send({to:'member@example.test',...message});
assert.equal(client.getMessages().length,1);
assert.ok(client.getMessages()[0].html.includes('External app'));
assert.ok(renderAnnouncementEmail({brand:{name:'External app'},senderName:'Community',title:'News',body:'Hello',actionUrl:'https://example.com/news'}).text.includes('Hello'));
await client.close();
console.log('Anonymous registry install, template imports, and sending passed');
`);
execFileSync(process.execPath,['smoke.mjs'],{cwd,env,stdio:'inherit'});
