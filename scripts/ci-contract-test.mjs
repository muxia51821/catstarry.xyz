import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const validate = await readFile('.github/workflows/validate.yml', 'utf8');
const publication = await readFile('.github/workflows/sync-production-publications.yml', 'utf8');
const siteProductionDeploy = await readFile('scripts/deploy-site-production.ps1', 'utf8');
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

const MANUAL_TEST_SCRIPTS = new Map([
  ['test:feed:ui', 'manual operator regression that requires FEED_UI_URL and real admin credentials against a deployed environment'],
  ['test:preview:local', 'manual smoke variant of local-preview.mjs; CI runs test:preview:lifecycle instead'],
]);

const referencedScripts = new Set();
for (const match of validate.matchAll(/\bnpm run ([a-z0-9:-]+)/gi)) referencedScripts.add(match[1]);
let grew = true;
while (grew) {
  grew = false;
  for (const name of [...referencedScripts]) {
    for (const match of (packageJson.scripts[name] ?? '').matchAll(/\bnpm run ([a-z0-9:-]+)/g)) {
      if (!referencedScripts.has(match[1])) {
        referencedScripts.add(match[1]);
        grew = true;
      }
    }
  }
}
const orphanedTestScripts = Object.keys(packageJson.scripts)
  .filter((name) => name.startsWith('test:') && !referencedScripts.has(name) && !MANUAL_TEST_SCRIPTS.has(name));
assert.deepEqual(
  orphanedTestScripts,
  [],
  `every test:* script must be reachable from validate.yml or be exempted as manual with a reason; orphans: ${orphanedTestScripts.join(', ')}`,
);
for (const [name, reason] of MANUAL_TEST_SCRIPTS) {
  assert.ok(packageJson.scripts[name], `manual exemption references missing script ${name}`);
  assert.ok(reason.length > 20, `manual exemption for ${name} must carry a real reason`);
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

const realSiteDeploy = siteProductionDeploy.indexOf(
  'Invoke-RequiredCommand npx wrangler deploy --config $workerConfig --name catstarry-site-production --keep-vars',
);
const finalSiteSmoke = siteProductionDeploy.indexOf("Assert-Http200 'https://catstarry.xyz/api/feed?limit=1'");
const redirectCleanup = siteProductionDeploy.indexOf('Remove-WranglerDeployRedirect -RepoRoot $repoRoot');
assert.ok(realSiteDeploy >= 0, 'site production runner must contain the real Wrangler deploy');
assert.ok(finalSiteSmoke > realSiteDeploy, 'site production smoke must follow the real deploy');
assert.ok(redirectCleanup > finalSiteSmoke, 'Wrangler redirect cleanup must run only after production smoke passes');
assert.equal(
  siteProductionDeploy.match(/Remove-WranglerDeployRedirect -RepoRoot \$repoRoot/g)?.length,
  1,
  'site production runner must have exactly one redirect cleanup call',
);
assert.match(siteProductionDeploy, /Join-Path \$RepoRoot '\.wrangler\/deploy\/config\.json'/);
assert.match(
  siteProductionDeploy,
  /Remove-Item -LiteralPath \$redirectConfig -Force -ErrorAction Stop[\s\S]*?catch \{[\s\S]*?Write-Warning/,
  'redirect cleanup must be best-effort after a successful deployment',
);
assert.doesNotMatch(
  siteProductionDeploy,
  /Remove-Item[^\n]*dist[\\/]server[\\/]wrangler\.json/i,
  'cleanup must preserve the generated Site Worker config for diagnostics and exact-build reuse',
);

console.log('CI command, production publication convergence, and Site deploy cleanup contracts passed.');
