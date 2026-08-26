import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const REPOSITORY = 'muxia51821/catstarry.xyz';
const WORKFLOW = 'sync-production-publications.yml';
const PROBE_URLS = [
  'https://catstarry.xyz/',
  'https://catstarry.xyz/activity-signals.json',
  'https://catstarry.xyz/api/feed?limit=1',
];

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

async function section(title, fn) {
  console.log(`\n== ${title} ==`);
  try {
    await fn();
  } catch (error) {
    console.log(`unavailable: ${error instanceof Error ? error.message : String(error)}`);
  }
}

await section('Local repository', async () => {
  const branch = git('branch', '--show-current') || '(detached HEAD)';
  git('fetch', 'origin', 'main', '--quiet');
  const head = git('rev-parse', 'HEAD').toLowerCase();
  const originMain = git('rev-parse', 'origin/main').toLowerCase();
  console.log(`Branch: ${branch}`);
  if (head === originMain) {
    console.log(`HEAD matches origin/main (${head.slice(0, 12)})`);
  } else {
    console.log(`HEAD ${head.slice(0, 12)} differs from origin/main ${originMain.slice(0, 12)}`);
  }
  const statusEntries = git('status', '--porcelain=v1', '-z').split('\0').filter(Boolean);
  const trackedChanges = statusEntries.filter((entry) => !entry.startsWith('?? '));
  if (trackedChanges.length === 0) {
    console.log('Tracked worktree: clean');
  } else {
    console.log(`Tracked worktree: DIRTY (${trackedChanges.join('; ')})`);
  }
});

await section('Latest production publication syncs', async () => {
  const { stdout } = await run('gh', [
    'run', 'list',
    '--repo', REPOSITORY,
    '--workflow', WORKFLOW,
    '--limit', '3',
    '--json', 'headSha,status,conclusion,createdAt',
  ]);
  const runs = JSON.parse(stdout);
  if (!Array.isArray(runs) || runs.length === 0) {
    console.log('No publication sync runs found.');
    return;
  }
  for (const item of runs) {
    const conclusion = item.conclusion ? ` / ${item.conclusion}` : '';
    console.log(`${item.createdAt} ${item.headSha.slice(0, 12)} ${item.status}${conclusion}`);
  }
  const latest = runs[0];
  if (latest.status === 'completed' && latest.conclusion === 'success') {
    console.log('=> Latest sync succeeded (that release is activated; no known freeze).');
  } else if (latest.status === 'completed') {
    console.log('=> Latest sync FAILED: a Learn pending barrier may still be active. See docs/DEPLOY.md failure handling before retrying anything.');
  } else {
    console.log('=> Sync still running; owner lifecycle mutations stay frozen until it succeeds.');
  }
});

await section('Production probes', async () => {
  for (const url of PROBE_URLS) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      console.log(`HTTP ${response.status}: ${url}`);
    } catch (error) {
      console.log(`unreachable: ${url} (${error instanceof Error ? error.message : String(error)})`);
    }
  }
});

console.log('\nFreeze authority: if /learn/admin fails closed, a pending release is active.');
