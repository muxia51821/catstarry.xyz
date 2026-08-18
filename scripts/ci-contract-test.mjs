import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const validate = await readFile('.github/workflows/validate.yml', 'utf8');
const publication = await readFile('.github/workflows/sync-production-publications.yml', 'utf8');
const nodeVersion = (await readFile('.node-version', 'utf8')).trim();

assert.match(nodeVersion, /^\d+\.\d+\.\d+$/, '.node-version must pin an exact runtime');
for (const [path, source] of [
  ['.github/workflows/validate.yml', validate],
  ['.github/workflows/sync-production-publications.yml', publication],
]) {
  for (const match of source.matchAll(/\bnpm run ([a-z0-9:-]+)/gi)) {
    assert.ok(packageJson.scripts[match[1]], `${path} references missing package script ${match[1]}`);
  }
}

for (const command of [
  'npm ci',
  'npm run test:contracts',
  'npm run test:learn:preview',
  'npm run worker:config',
  'npm run worker:types:check',
  'npm run worker:typecheck',
  'npm run site:typecheck',
  'npm run build',
  'npm run test:site-output',
  'npm run test:browser:ci',
  'npm run test:feed:worker',
  'npm run worker:migrate:local:repeat',
  'npm run worker:dry-run',
  'git diff --check',
]) {
  assert.ok(validate.includes(command), `validation workflow must run ${command}`);
}
assert.match(publication, /fetch-depth:\s*0/, 'publication release generation requires complete Git history');
assert.match(publication, /\[\[ "\$DEPLOYED_SHA" =~ \^\[0-9a-f\]\{40\}\$ \]\]/);
assert.match(publication, /git merge-base --is-ancestor "\$DEPLOYED_SHA" origin\/main/);
assert.match(publication, /npm ci --ignore-scripts/);
assert.match(publication, /permissions:\s*\n\s+contents: read/);
assert.match(publication, /concurrency:\s*\n\s+group:\s*production-publication-sync\s*\n\s+cancel-in-progress:\s*false/);
assert.match(publication, /id:\s*blog-sync[\s\S]*?continue-on-error:\s*true[\s\S]*?npm run blog:sync-publications/);
assert.match(publication, /id:\s*learn-sync[\s\S]*?continue-on-error:\s*true[\s\S]*?npm run learn:sync-publications/);
assert.match(publication, /if:\s*always\(\)[\s\S]*?steps\.blog-sync\.outcome[\s\S]*?steps\.learn-sync\.outcome/);

console.log('CI command and production publication convergence contracts passed.');
