import { execFile, execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { promisify } from 'node:util';

import { gitPublicationReleaseIdentity } from './lib/publication-release.mjs';
import { runProductionSmoke } from './lib/production-smoke.mjs';

const run = promisify(execFile);

const REPOSITORY = 'muxia51821/catstarry.xyz';
const EVENT_TYPE = 'catstarry-production-deployment-succeeded';
const WORKFLOW_URL = `https://github.com/${REPOSITORY}/actions/workflows/sync-production-publications.yml`;
const SMOKE_URLS = [
  'https://catstarry.xyz/',
  'https://catstarry.xyz/activity-signals.json',
  'https://catstarry.xyz/api/feed?limit=1',
];
const SMOKE_TIMEOUT_MS = 30000;
const SMOKE_MAX_ATTEMPTS = 3;
const SMOKE_RETRY_DELAY_MS = 3000;

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function assertWorktreeReadyForRelease() {
  git('fetch', 'origin', 'main', '--quiet');
  const head = git('rev-parse', 'HEAD').toLowerCase();
  const originMain = git('rev-parse', 'origin/main').toLowerCase();
  if (head !== originMain) {
    throw new Error(`HEAD (${head}) must exactly match origin/main (${originMain})`);
  }

  const statusEntries = git('status', '--porcelain=v1', '-z').split('\0').filter(Boolean);
  const trackedChanges = statusEntries.filter((entry) => !entry.startsWith('?? '));
  if (trackedChanges.length > 0) {
    throw new Error(`tracked changes present: ${trackedChanges.join('; ')}`);
  }
  const unexpectedUntracked = statusEntries
    .filter((entry) => entry.startsWith('?? '))
    .map((entry) => entry.slice(3).replaceAll('\\', '/'))
    .filter((entry) => !entry.startsWith('.scratch/'));
  if (unexpectedUntracked.length > 0) {
    throw new Error(`untracked files outside .scratch/: ${unexpectedUntracked.join('; ')}`);
  }
}

async function assertProductionSmoke() {
  await runProductionSmoke(SMOKE_URLS, {
    timeoutMs: SMOKE_TIMEOUT_MS,
    maxAttempts: SMOKE_MAX_ATTEMPTS,
    retryDelayMs: SMOKE_RETRY_DELAY_MS,
  });
}

async function confirmSend() {
  if (process.argv.includes('--yes')) return;
  if (!process.stdin.isTTY) {
    throw new Error('refusing to send without interactive confirmation; pass --yes to override');
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question('Send repository_dispatch now? (y/N) ');
    if (answer.trim().toLowerCase() !== 'y') {
      throw new Error('confirmation declined; nothing was sent');
    }
  } finally {
    rl.close();
  }
}

try {
  assertWorktreeReadyForRelease();
  const release = gitPublicationReleaseIdentity('HEAD');

  console.log(`Repository: ${REPOSITORY}`);
  console.log(`Event type: ${EVENT_TYPE}`);
  console.log(`Payload: environment=production status=success sha=${release.sha} (generation ${release.generation})`);

  await assertProductionSmoke();

  console.log('');
  console.log('Send only after the deploy runner completed successfully AND you have verified production serves this release.');
  await confirmSend();

  await run('gh', [
    'api',
    `repos/${REPOSITORY}/dispatches`,
    '-f', `event_type=${EVENT_TYPE}`,
    '-f', 'client_payload[environment]=production',
    '-f', 'client_payload[status]=success',
    '-f', `client_payload[sha]=${release.sha}`,
  ]);

  console.log('Dispatch sent.');
  console.log(`Watch the publication sync: ${WORKFLOW_URL}`);
  console.log('The Learn pending barrier remains until that sync activates this release.');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
